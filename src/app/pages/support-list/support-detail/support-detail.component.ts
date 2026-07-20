import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subscription } from 'rxjs'; 
import { SupportService, TicketDetailDto, ReplyTicketDto } from 'src/app/services/support.service';
import { AuthService } from 'src/app/services/auth.service';
import { ReplaceSpacesPipe } from 'src/app/pipe/replace-spaces.pipe';
import { SignalRService, ChatMessageDto } from 'src/app/services/signalr.service';
import { NotificationService } from 'src/app/services/notification.service';

@Component({
  selector: 'app-support-detail',
  standalone: true,
  imports: [
    CommonModule, 
    MaterialModule, 
    ReactiveFormsModule, 
    ReplaceSpacesPipe,
    TablerIconsModule
  ],
  templateUrl: './support-detail.component.html',
  styleUrls: ['./support-detail.component.scss']
})
export class SupportDetailComponent implements OnInit, AfterViewChecked, OnDestroy {
  ticketId!: number;
  ticketData?: TicketDetailDto;
  replyForm: FormGroup;
  isSubmitting = false;
  currentUserRole: string | null = '';
  currentUserId: number | null = 0;
  isClosing = false;

  // Track subscription to unsubscribe later
  private signalRSubscription!: Subscription;

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private supportService: SupportService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private location: Location,
    private signalRService: SignalRService,
    private notificationService: NotificationService
  ) {
    this.replyForm = this.fb.group({
      message: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.currentUserRole = this.authService.getUserRole();
    this.currentUserId = this.authService.getUserId();

    // ✅ NEW: Subscribe to route changes instead of using snapshot
    this.route.paramMap.subscribe(params => {
      const paramId = params.get('id');
      const parsedId = Number(paramId);

      // Make sure it's a valid number and not NaN
      if (parsedId && !isNaN(parsedId)) {
        
        // 1. Cleanup previous SignalR connection if we are switching tickets
        if (this.ticketId) {
          this.signalRService.leaveTicketGroup(this.ticketId);
          if (this.signalRSubscription) {
            this.signalRSubscription.unsubscribe();
          }
        }

        // 2. Set new ID and clear old data so loader shows
        this.ticketId = parsedId;
        this.ticketData = undefined; // Forces the spinner to show while fetching

        // ✨ CRITICAL FIX: Instantly clear any unread bell notifications for this ticket!
        this.notificationService.clearNotificationsForTicket(this.ticketId);

        // 3. Load new ticket details
        this.loadTicketDetails();
        
        // 4. Join new SignalR Group
        this.signalRService.joinTicketGroup(this.ticketId);

        this.signalRSubscription = this.signalRService.messageReceived$.subscribe((msg: ChatMessageDto | null) => {
          if (msg && msg.ticketId === this.ticketId) {
            this.pushNewMessage(msg);
          }
        });
      } else {
        console.error('Invalid Ticket ID in URL:', paramId);
        // Optional: Redirect back to /support if URL is garbage
        // this.router.navigate(['/support']);
      }
    });
  }

  pushNewMessage(msg: ChatMessageDto) {
    if (!this.ticketData) return;

    if (this.isMyMessage(msg.isAdminReply)) {
        return; 
    }

    // ✨ UTC FIX 3: Fix incoming live WebSocket messages
    const fixedDate = msg.createdOn && !msg.createdOn.endsWith('Z') 
                      ? msg.createdOn + 'Z' 
                      : msg.createdOn;

    this.ticketData.history.push({
      id: 0, 
      message: msg.message,
      isAdminReply: msg.isAdminReply,
      createdOn: fixedDate, // Use the fixed UTC date here
      attachmentUrl: msg.attachmentUrl
    });

    setTimeout(() => this.scrollToBottom(), 100);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  ngOnDestroy(): void {
    if (this.ticketId) {
        this.signalRService.leaveTicketGroup(this.ticketId);
    }
    if (this.signalRSubscription) {
        this.signalRSubscription.unsubscribe();
    }
  }

  goBack() {
    this.location.back();
  }

  loadTicketDetails() {
    this.supportService.getTicketDetails(this.ticketId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          let data = res.data;

          // ✨ UTC FIX 1: Fix the Header Date (Left Panel)
          if (data.header && data.header.updatedOn && !data.header.updatedOn.endsWith('Z')) {
            data.header.updatedOn += 'Z';
          }

          // ✨ UTC FIX 2: Fix all Historical Chat Bubbles
          if (data.history && Array.isArray(data.history)) {
            data.history = data.history.map((msg: any) => ({
              ...msg,
              createdOn: msg.createdOn && !msg.createdOn.endsWith('Z') 
                         ? msg.createdOn + 'Z' 
                         : msg.createdOn
            }));
          }

          this.ticketData = data;
          setTimeout(() => this.scrollToBottom(), 200);
        } else {
          this.snackBar.open('Failed to load ticket details', 'Close', { duration: 3000 });
        }
      },
      error: (err) => {
        this.snackBar.open('Error loading details', 'Close', { duration: 3000 });
      }
    });
  }

  submitReply() {
    if (this.replyForm.invalid || !this.currentUserId) return;

    this.isSubmitting = true;

    const isAdmin = this.currentUserRole === 'SystemAdmin';

    const messageText = this.replyForm.value.message; // Store text before reset

    const dto: ReplyTicketDto = {
      ticketId: this.ticketId,
      senderUserId: this.currentUserId,
      isAdminReply: isAdmin, 
      message: messageText
    };

    // 1. Optimistic UI Update: Show it instantly on the screen
    this.ticketData?.history.push({
        id: 0,
        message: messageText,
        isAdminReply: isAdmin,
        createdOn: new Date().toISOString(),
        attachmentUrl: ''
    });
    setTimeout(() => this.scrollToBottom(), 100);
    this.replyForm.reset();

    // 2. Send to backend
    this.supportService.replyTicket(dto).subscribe({
      next: (res) => {
        if (res.success) {
          // Silently reload the background data to get the exact Database ID and Timestamp
          this.loadTicketDetails(); 
        } else {
          this.snackBar.open(res.message, 'Close', { duration: 3000 });
        }
        this.isSubmitting = false;
      },
      error: (err) => {
        this.isSubmitting = false;
        this.snackBar.open('Failed to send reply', 'Close', { duration: 3000 });
      }
    });
  }

  isMyMessage(messageIsAdminReply: boolean): boolean {
    const iAmAdmin = this.currentUserRole === 'SystemAdmin'
                     
    // If I am Admin and Message is Admin Reply -> It's Mine (Right side)
    // If I am User and Message is NOT Admin Reply -> It's Mine (Right side)
    return iAmAdmin === messageIsAdminReply;
  }

  closeTicket() {
    if (!this.ticketId) return;

    // 1. Optimistic UI update (feels instant to the user)
    if (this.ticketData) {
      this.ticketData.header.status = 'Closed';
    }

    // 2. Send to backend
    this.supportService.updateTicketStatus(this.ticketId, 'Closed').subscribe({
      next: (res) => {
        if (!res.success) {
          // Revert on failure
          if (this.ticketData) this.ticketData.header.status = 'Open'; 
          this.snackBar.open(res.message || 'Failed to close ticket', 'Close', { duration: 3000 });
        } else {
          this.snackBar.open('Ticket closed successfully', 'Close', { duration: 3000 });
          // Optional: Send a local event to refresh the main grid list if needed
        }
      },
      error: () => {
        if (this.ticketData) this.ticketData.header.status = 'Open';
        this.snackBar.open('Error closing ticket', 'Close', { duration: 3000 });
      }
    });
  }
}