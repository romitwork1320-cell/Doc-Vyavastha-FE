import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router'; // ✅ ADDED ROUTER
import { environment } from '../environments/environments';
import { AuthService, ApiResponse } from './auth.service';
import { SignalRService } from './signalr.service';

export interface NotificationDto {
  id: number;
  userId: string;
  type: number;
  title: string;
  message: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/Notifications`;
  
  private unreadNotificationsSubject = new BehaviorSubject<NotificationDto[]>([]);
  public unreadNotifications$ = this.unreadNotificationsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private signalRService: SignalRService,
    private router: Router // ✅ INJECT ROUTER
  ) {
    this.listenForRealTimeUpdates();

    this.signalRService.connectionRestored$.subscribe(() => {
        this.loadUnreadNotifications();
    });
  }

  public loadUnreadNotifications(): void {
    const userId = this.authService.getUserId()?.toString(); 
    if (!userId) return;

    this.http.get<ApiResponse<NotificationDto[]>>(`${this.apiUrl}/unread/${userId}`)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.unreadNotificationsSubject.next(response.data);
          }
        },
        error: (err) => console.error('Failed to load notifications', err)
      });
  }

  // ✅ 1. OPTIMISTIC UI: Removes it instantly from the dropdown list
  public markAsRead(id: number): Observable<ApiResponse<any>> {
    const currentList = this.unreadNotificationsSubject.value;
    this.unreadNotificationsSubject.next(currentList.filter(n => n.id !== id));

    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}/read`, {});
  }

  // Helper for background marking
  public markAsReadSilently(id: number): void {
    this.markAsRead(id).subscribe({
      error: (err) => console.error('Failed to mark read in background', err)
    });
  }

  // ✅ 2. AUTO-CLEAR ON CHAT OPEN: Sweeps away notifications when you open a ticket manually
  public clearNotificationsForTicket(ticketId: string | number): void {
    const ticketIdStr = ticketId.toString();
    const currentList = this.unreadNotificationsSubject.value;
    
    // Find all notifications related to this specific ticket
    const matchingNotifs = currentList.filter(n => n.referenceId === ticketIdStr);
    
    if (matchingNotifs.length > 0) {
      // Remove them from UI instantly
      this.unreadNotificationsSubject.next(currentList.filter(n => n.referenceId !== ticketIdStr));
      
      // Tell server to mark them as read in the background
      matchingNotifs.forEach(n => this.markAsReadSilently(n.id));
    }
  }

  // ✅ 3. MUTE ACTIVE CHAT: Don't show notifications if they are already looking at the screen
  // ✅ MUTE ACTIVE CHAT, MAP CASING, AND FILTER BY USER
  private listenForRealTimeUpdates(): void {
    this.signalRService.notificationReceived$.subscribe({
      next: (rawNotif: any) => {
        
        // ✨ 1. Safely map SignalR properties (Handles both lowercase and uppercase from C#)
        const newNotification: NotificationDto = {
            id: rawNotif.id || rawNotif.Id,
            userId: rawNotif.userId || rawNotif.UserId,
            type: rawNotif.type || rawNotif.Type,
            title: rawNotif.title || rawNotif.Title,
            message: rawNotif.message || rawNotif.Message,
            referenceId: rawNotif.referenceId || rawNotif.ReferenceId,
            isRead: rawNotif.isRead || rawNotif.IsRead || false,
            createdAt: rawNotif.createdAt || rawNotif.CreatedAt
        };

        // ✨ 2. USER FILTER: Ignore if this notification belongs to a different user in the same Tenant
        const myUserId = this.authService.getUserId()?.toString();
        if (newNotification.userId && 
            newNotification.userId.toString() !== myUserId && 
            newNotification.userId !== 'ALL') {
            return; 
        }

        // 3. MUTE ACTIVE CHAT: Don't show notifications if they are already looking at the screen
        const currentUrl = this.router.url;
        if (newNotification.referenceId && currentUrl.includes(`/support/${newNotification.referenceId}`)) {
            // User is actively reading it! Mark read in DB and DO NOT show the bell badge.
            this.markAsReadSilently(newNotification.id);
            return; 
        }

        // 4. ANTI-DUPLICATE FIX: Only add it to the dropdown if this exact ID isn't already there!
        const currentList = this.unreadNotificationsSubject.value;
        if (!currentList.some(n => n.id === newNotification.id)) {
            this.unreadNotificationsSubject.next([newNotification, ...currentList]);
        }
      },
      error: (err: any) => console.error('Error receiving notification:', err)
    });
  }
}