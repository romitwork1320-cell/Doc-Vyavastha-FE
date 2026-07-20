import { AfterViewInit, Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, ElementRef } from '@angular/core';
import { MatTableDataSource, MatTable } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';
import { DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module'; // Assuming this exports all Mat modules
import { ServiceRequest, ServiceRequestService, ServiceRequestUpdateDto } from 'src/app/services/service-request.service';
import { GlobalSearchService } from 'src/app/services/global-search.service';
import { GlobalFilterService } from 'src/app/services/global-filter.service';
import { SwipeableDirective } from 'src/app/common/directive/swipeable.directive';
import { PaginationRequestDto } from 'src/app/common/interfaces/common';
import { DialogData, ReplacementProductDialogComponent } from '../replacement-products/replacement-product-dialog/replacement-product-dialog.component';
import { EncryptionService } from 'src/app/services/encryption.service';
import { QRCodeModule } from 'angularx-qrcode';
import { QrCodeDialogComponent } from './qr-code-dialog/qr-code-dialog.component';
import { Clipboard } from '@angular/cdk/clipboard';
import { ServiceRequestViewDialogComponent } from './service-request-view-dialog/service-request-view-dialog.component';
import { ServiceRequestResolveDialogComponent } from './service-request-resolve-dialog/service-request-resolve-dialog.component';

@Component({
  selector: 'app-service-request-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TablerIconsModule,
    MaterialModule,
    SwipeableDirective,
    QRCodeModule,
    ServiceRequestViewDialogComponent,
    ServiceRequestResolveDialogComponent
  ],
  templateUrl: './service-request-list.component.html',
  styleUrls: ['./service-request-list.component.scss'],
  providers: [DatePipe]
})
export class ServiceRequestListComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['#', 'RequestDate', 'TicketCode', 'GuestName', 'Category', 'Status', 'action'];
  dataSource: MatTableDataSource<ServiceRequest> = new MatTableDataSource<ServiceRequest>();
  
  isLoading: boolean = false;
  filterValue: string = '';
  swipedRequestId: number | null = null;
  
  // Data State
  public serviceRequests: ServiceRequest[] = [];
  private currentPage: number = 0;
  private pageSize: number = 15;
  private hasMoreData: boolean = true;
  
  private filterSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private searchSubscription: Subscription;
  private refreshSubscription: Subscription;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('tableContainer') private tableContainer: ElementRef;

  constructor(
    private serviceRequestService: ServiceRequestService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private globalSearchService: GlobalSearchService,
    private changeDetectorRef: ChangeDetectorRef,
    private encryptionService: EncryptionService,
    private clipboard: Clipboard
  ) {}

  ngOnInit(): void {
    // Global Search Subscription
    this.searchSubscription = this.globalSearchService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe(query => {
        this.filterSubject.next(query);
      });

    // Global Refresh Subscription
    this.refreshSubscription = this.globalSearchService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.resetAndLoadRequests());

    // Debounce Filter
    this.filterSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(filterValue => {
      this.filterValue = filterValue;
      this.resetAndLoadRequests();
    });

    this.loadServiceRequests();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.sort.sortChange.pipe(takeUntil(this.destroy$)).subscribe(() => this.resetAndLoadRequests());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.searchSubscription) this.searchSubscription.unsubscribe();
    if (this.refreshSubscription) this.refreshSubscription.unsubscribe();
  }

  copySupportLink() {
    // Replace with actual logic to get logged-in TenantId (e.g. from AuthService)
    const rawTenantId = localStorage.getItem('tenant_id') || '1'; 
    const encryptedId = this.encryptionService.encrypt(rawTenantId);
    const baseUrl = window.location.origin;
    const supportUrl = `${baseUrl}/public/${encryptedId}/support`;
    
    if (this.clipboard.copy(supportUrl)) {
      this.snackBar.open('Link copied to clipboard!', 'Close', { 
        duration: 3000, 
        panelClass: ['success-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    }
  }

  openQrCodeDialog(): void {
    const rawTenantId = localStorage.getItem('tenant_id') || '1'; 
    const encryptedId = this.encryptionService.encrypt(rawTenantId);
    const baseUrl = window.location.origin;
    const supportUrl = `${baseUrl}/public/${encryptedId}/support`;

    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '400px';
    dialogConfig.data = { url: supportUrl };
    dialogConfig.autoFocus = false;

    this.dialog.open(QrCodeDialogComponent, dialogConfig);
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filterValue = filterValue.trim(); // Update local state
    this.filterSubject.next(this.filterValue); // Trigger the debounce search
  }

  // --- Data Loading Logic (Matches Replacement Page) ---
  
  private resetAndLoadRequests(): void {
    this.serviceRequests = [];
    this.currentPage = 0;
    this.hasMoreData = true;
    this.dataSource.data = [];
    this.loadServiceRequests();
  }

  loadServiceRequests(): void {
    if (this.isLoading || !this.hasMoreData) return;

    this.isLoading = true;
    const request: PaginationRequestDto = {
      pageIndex: this.currentPage,
      pageSize: this.pageSize,
      filter: this.filterValue,
      sortColumn: this.sort?.active || 'TicketCode',
      sortDirection: (this.sort?.direction || 'desc') as 'asc' | 'desc' | null,
    };

    this.serviceRequestService.getServiceRequests(request)
      .pipe(finalize(() => this.isLoading = false), takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const newItems = response.data || [];
            this.serviceRequests = [...this.serviceRequests, ...newItems];
            this.dataSource.data = this.serviceRequests;
            this.currentPage++;
            this.hasMoreData = newItems.length === this.pageSize;
            this.checkAndLoadMore();
          }
        },
        error: (err) => console.error(err)
      });
  }

  onScroll(event: Event): void {
    if (!this.isLoading && this.hasMoreData) {
      const element = event.target as HTMLElement;
      if (element.scrollHeight - element.scrollTop - element.clientHeight <= 100) {
        this.loadServiceRequests();
      }
    }
  }

  private checkAndLoadMore(): void {
    setTimeout(() => {
      if (!this.tableContainer || !this.hasMoreData || this.isLoading) return;
      const element = this.tableContainer.nativeElement;
      if (!(element.scrollHeight > element.clientHeight)) {
        this.loadServiceRequests();
      }
    }, 50);
  }

  // Mark Resolved (Simple Status Update)
  markResolved(request: ServiceRequest): void {
    const dialogRef = this.dialog.open(ServiceRequestResolveDialogComponent, {
      width: '450px',
      data: request,
      autoFocus: false
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result && result.confirmed) {
        
        const dto: ServiceRequestUpdateDto = {
          id: request.id,
          status: 'Resolved',
          adminRemarks: result.remarks // Use remarks from the dialog
        };

        this.updateStatus(dto);
      }
    });
  }

  // 2. THE BRIDGE: Convert to Replacement
  openConvertToReplacementDialog(request: ServiceRequest): void {
    const dialogData: DialogData = {
      action: 'Add', // We are Adding a NEW Replacement
      replacement: {
        id: 0,
        // PRE-FILL DATA FROM SERVICE REQUEST
        contact: {
          id: 0, 
          name: request.guestName, // Auto-fill Name
          contactNo: request.guestPhone, // Auto-fill Phone
          isActive: true
        },
        // Put the description in the Note/Remarks so tech knows context
        note: `Converted from Service Request ${request.ticketCode}: ${request.description}`, 
        replacedItems: [] 
      }
    };

    const dialogRef = this.dialog.open(ReplacementProductDialogComponent, {
      width: '1300px',
      data: dialogData,
      autoFocus: false
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      // Result should contain the Response from the API if successful
      if (result && result.data && result.event !== 'Cancel') {
        // Assuming result.data contains the new InvertNo (e.g., "DIREP055")
        const newInvertNo = result.data; 
        
        // Now update the Service Request to link it!
        const updateDto: ServiceRequestUpdateDto = {
          id: request.id,
          status: 'Converted',
          linkedReplacementInvertNo: newInvertNo
        };
        this.updateStatus(updateDto);
      }
    });
  }

  private updateStatus(dto: ServiceRequestUpdateDto): void {
    this.serviceRequestService.updateStatus(dto).subscribe(res => {
      if(res.success) {
        this.snackBar.open('Status Updated Successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        this.resetAndLoadRequests();
      } else {
        this.snackBar.open(res.message, 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
      }
    });
  }

  getStatusClasses(status: string): string {
    if (!status) return '';
    return status.toLowerCase().trim(); // pending, resolved, converted
  }

  onSwipe(id: number, action: string) {
    this.swipedRequestId = action === 'open' ? id : null;
  }

  viewDetails(request: ServiceRequest): void {
    this.dialog.open(ServiceRequestViewDialogComponent, {
      width: '600px',
      data: request,
      autoFocus: false
    });
  }
}