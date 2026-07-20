import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectorRef, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { finalize, takeUntil, throttleTime } from 'rxjs/operators';
import { TablerIconsModule } from 'angular-tabler-icons';

import { SupportService, TicketListDto } from 'src/app/services/support.service';
import { SupportCreateDialogComponent } from './support-create-dialog/support-create-dialog.component';
import { GlobalSearchService } from 'src/app/services/global-search.service';
import { FabClickService } from 'src/app/services/fab-click.service';
import { SwipeableDirective } from 'src/app/common/directive/swipeable.directive';
import { ReplaceSpacesPipe } from 'src/app/pipe/replace-spaces.pipe';
import { AuthService } from 'src/app/services/auth.service';
import { SignalRService } from 'src/app/services/signalr.service';
import { TenantService } from 'src/app/services/tenant.service'; 
import { PaginationRequestDto } from 'src/app/common/interfaces/common';

@Component({
  selector: 'app-support-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatSelectModule,
    TablerIconsModule,
    SwipeableDirective,
    ReplaceSpacesPipe
  ],
  templateUrl: './support-list.component.html',
  styleUrls: ['./support-list.component.scss']
})
export class SupportListComponent implements OnInit, AfterViewInit, OnDestroy {
  // Columns
  displayedColumns: string[] = ['ticketNo', 'subject', 'category', 'priority', 'status', 'updatedOn', 'actions'];
  dataSource: MatTableDataSource<TicketListDto> = new MatTableDataSource<TicketListDto>();
  
  // State
  isLoading = false;
  filterValue = '';
  selectedTenantId: number | null = null;
  swipedTicketId: number | null = null;
  
  // Super Admin Logic
  isSuperAdmin = false;
  tenants: any[] = []; 

  public tickets: TicketListDto[] = [];
  
  private destroy$ = new Subject<void>();
  private fabClickSubscription!: Subscription;
  private searchSubscription!: Subscription;
  private refreshSubscription!: Subscription;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('tableContainer') tableContainer!: ElementRef;

  constructor(
    private supportService: SupportService,
    private authService: AuthService,
    private tenantService: TenantService,
    private signalRService: SignalRService, 
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef,
    private fabClickService: FabClickService,
    private globalSearchService: GlobalSearchService
  ) {}

  ngOnInit(): void {
    this.checkRole();
    
    // Global FAB
    this.fabClickSubscription = this.fabClickService.fabClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.openCreateDialog());

    // Refresh (Manual)
    this.refreshSubscription = this.globalSearchService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.resetAndLoadTickets());

    // Global Search (Text)
    this.searchSubscription = this.globalSearchService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe(query => {
        this.filterValue = query;
        this.applyFilters();
      });

    // ✨ CRITICAL FIX: SignalR Auto-Refresh
    this.signalRService.listRefreshRequired$
      .pipe(takeUntil(this.destroy$))
      .subscribe(shouldRefresh => {
        if (shouldRefresh) {
          this.loadTickets();
          // MUST reset to false so it can trigger again next time!
          this.signalRService.listRefreshRequired$.next(false); 
        }
      });
  }

  // ✨ CRITICAL FIX: Match all Admin roles perfectly
  checkRole() {
    const role = this.authService.getUserRole();
    
    // Ensure all admin variations are covered identically to the SignalR service
    this.isSuperAdmin = (role === 'SystemAdmin');

    if (this.isSuperAdmin) {
      this.displayedColumns = ['ticketNo', 'tenantName', 'subject', 'category', 'priority', 'status', 'updatedOn', 'actions'];
      this.loadTenants();
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;

    // Custom Filter Predicate
    this.dataSource.filterPredicate = (data: TicketListDto, filter: string) => {
      const searchTerms = JSON.parse(filter);
      
      const matchesText = !searchTerms.text || 
        data.subject.toLowerCase().includes(searchTerms.text) || 
        data.ticketNo.toLowerCase().includes(searchTerms.text);
      const matchesTenant = !searchTerms.tenantId || data.tenantId === searchTerms.tenantId;

      return matchesText && matchesTenant;
    };

    this.changeDetectorRef.detectChanges();
    this.loadTickets();
  }

  loadTenants() {
    const request: PaginationRequestDto = {
      pageIndex: 0,
      pageSize: 100, 
      filter: '',
      sortColumn: 'companyName',
      sortDirection: 'asc'
    };

    this.tenantService.getTenants(request).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.tenants = res.data.map((t: any) => ({
            id: t.tenantId, 
            name: t.companyName || t.tenantName 
          }));
        }
      },
      error: (err) => {
        console.error('Failed to load tenants for filter', err);
      }
    });
  }

  // ✅ [FIXED] Context-Aware Loading with NG0100 Protection
  loadTickets() {
    // Determine the correct Tenant ID to request
    let apiParamId = 0; 

    if (this.isSuperAdmin) {
        // If Super Admin: 0 means "Get All" (Correct)
        apiParamId = 0; 
    } else {
        // If Tenant User: MUST pass their own Tenant ID
        const myTenantId = this.authService.getTenantId();
        apiParamId = myTenantId ? Number(myTenantId) : 0;
    }

    // Push the initial loading state into the next frame
    setTimeout(() => {
      if (this.tickets.length === 0) {
          this.isLoading = true;
      }
    }, 0);
    
    this.supportService.getTickets(apiParamId).pipe(
      finalize(() => setTimeout(() => this.isLoading = false, 0))
    ).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          setTimeout(() => {
            
            // ✨ THE UTC TIMEZONE FIX
            // We force Angular to recognize the server's dates as UTC by appending 'Z'
            this.tickets = (res.data || []).map((ticket: any) => ({
              ...ticket,
              updatedOn: ticket.updatedOn && !ticket.updatedOn.endsWith('Z') 
                         ? ticket.updatedOn + 'Z' 
                         : ticket.updatedOn
            }));

            this.dataSource.data = this.tickets;
            this.applyFilters(); 
            this.changeDetectorRef.detectChanges();
          }, 0);

        } else {
          this.snackBar.open(res.message || 'Failed to load tickets', 'Close', { duration: 3000 });
        }
      },
      error: (err) => {
        this.snackBar.open('Error loading tickets', 'Close', { duration: 3000 });
      }
    });
  }

  applyFilters() {
    const filterObj = {
      text: this.filterValue.trim().toLowerCase(),
      tenantId: this.selectedTenantId
    };
    this.dataSource.filter = JSON.stringify(filterObj);
  }

  onTenantFilterChange(tenantId: number | null) {
    this.selectedTenantId = tenantId;
    this.applyFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  resetAndLoadTickets() {
    this.tickets = [];
    this.dataSource.data = [];
    this.loadTickets();
  }

  openCreateDialog() {
      const dialogRef = this.dialog.open(SupportCreateDialogComponent, { width: '600px', disableClose: false });
      dialogRef.afterClosed().subscribe(result => { if (result) this.resetAndLoadTickets(); });
  }

  viewDetails(ticketId: number) { 
      this.router.navigate(['/support', ticketId]); 
  }
  
  onSwipe(id: number, action: 'open' | 'close') {
    this.swipedTicketId = action === 'open' ? id : null;
  }
}