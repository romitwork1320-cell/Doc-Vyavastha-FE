// src/app/pages/tenants/tenant-list.component.ts

import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectorRef, OnDestroy, ElementRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, Subject, Subscription, takeUntil } from 'rxjs';
import { Tenant, TenantService, DashboardStats } from 'src/app/services/tenant.service'; // Added DashboardStats
import { ApiResponse, PaginationRequestDto } from 'src/app/common/interfaces/common'; 

// Import necessary modules for standalone component
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GlobalSearchService } from 'src/app/services/global-search.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CreateTenantDialogComponent } from './create-tenant-dialog/create-tenant-dialog';
import { GeneratePromoDialogComponent } from './generate-promo-dialog/generate-promo-dialog.component';

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TablerIconsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSlideToggleModule
  ],
  templateUrl: './tenant-list.component.html',
  styleUrls: ['./tenant-list.component.scss']
})
export class TenantListComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = [
    '#',
    'companyName',
    'contactPhone',
    'whatsAppSentCount',
    'whatsAppBalance',
    'subscriptionStatus', // NEW
    'subscriptionEndDate', // NEW
    'addBalance',
    'action',
    'isActive'
  ];
  dataSource: MatTableDataSource<Tenant> = new MatTableDataSource<Tenant>();
  isLoading: boolean = false;
  filterValue: string = '';
  isTogglingActive: { [tenantId: number]: boolean } = {};

  // Tenants Data
  tenants: Tenant[] = [];
  private currentPage: number = 0;
  private pageSize: number = 15;
  private hasMoreData: boolean = true;

  // --- NEW: Stats Property ---
  stats: DashboardStats | null = null;

  // Balance Management
  balanceAmounts: { [tenantId: number]: number | null } = {};
  isUpdatingBalance: { [tenantId: number]: boolean } = {};

  private destroy$ = new Subject<void>();
  private searchSubscription: Subscription;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('tableContainer') tableContainer!: ElementRef;

  constructor(
    private tenantService: TenantService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef,
    private globalSearchService: GlobalSearchService
  ) {}

  ngOnInit(): void {
    // 1. Subscribe to Global Search
    this.searchSubscription = this.globalSearchService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe(query => {
        this.filterValue = query;
        this.resetAndLoadTenants();
      });

    // 2. --- NEW: Load Dashboard Stats ---
    this.loadStats();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.sort.sortChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.resetAndLoadTenants();
      });
    this.changeDetectorRef.detectChanges();
    this.loadTenants();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- NEW: Load Stats Method ---
  loadStats(): void {
    this.tenantService.getDashboardStats().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.stats = res.data;
        }
      },
      error: (err) => console.error('Failed to load stats', err)
    });
  }

  // --- NEW: Open Create Dialog Method ---
  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateTenantDialogComponent, {
      width: '450px',
      disableClose: true // Prevent closing by clicking outside
    });

    dialogRef.afterClosed().subscribe(result => {
      // If result is true, it means a tenant was successfully created
      if (result) {
        this.resetAndLoadTenants(); // Reload the table
        this.loadStats(); // Reload the stats cards
      }
    });
  }

  onScroll(event: Event): void {
    if (!this.isLoading && this.hasMoreData) {
      const element = event.target as HTMLElement;
      const threshold = 100;
      if (element.scrollHeight - element.scrollTop - element.clientHeight <= threshold) {
        this.loadTenants();
      }
    }
  }

  private resetAndLoadTenants(): void {
    this.tenants = [];
    this.currentPage = 0;
    this.hasMoreData = true;
    this.dataSource.data = [];
    this.loadTenants();
  }

  loadTenants(): void {
    if (this.isLoading || !this.hasMoreData) return;
    this.isLoading = true;

    const request: PaginationRequestDto = {
      pageIndex: this.currentPage,
      pageSize: this.pageSize,
      filter: this.filterValue,
      sortColumn: this.sort?.active || 'TenantId',
      sortDirection: (this.sort?.direction || 'asc') as 'asc' | 'desc',
    };

    this.tenantService.getTenants(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: ApiResponse<Tenant[]>) => {
          if (response.success && response.data) {
            const newTenants = response.data || [];
            this.tenants = [...this.tenants, ...newTenants];
            this.dataSource.data = this.tenants;
            this.currentPage++;
            this.hasMoreData = newTenants.length === this.pageSize;

            newTenants.forEach(t => {
                if(this.balanceAmounts[t.tenantId] === undefined) {
                    this.balanceAmounts[t.tenantId] = null;
                }
                this.isUpdatingBalance[t.tenantId] = false;
            });
            this.checkAndLoadMore();
          } else {
            this.snackBar.open(`Error loading tenants: ${response.message}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
            this.hasMoreData = false;
          }
        },
        error: (error) => {
          console.error('Failed to load tenants:', error);
          this.snackBar.open('Failed to load tenants. Please try again.', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          this.hasMoreData = false;
        }
      });
  }

  addBalance(tenantId: number): void {
    const amount = this.balanceAmounts[tenantId];
    if (amount === null || amount === undefined || amount <= 0 || !Number.isInteger(amount)) {
      this.snackBar.open('Please enter a valid positive whole number to add.', 'Close', { duration: 3000, panelClass: ['warning-snackbar'] });
      return;
    }

    this.isUpdatingBalance[tenantId] = true;

    this.tenantService.addWhatsAppBalance(tenantId, amount)
      .pipe(finalize(() => this.isUpdatingBalance[tenantId] = false ))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const index = this.tenants.findIndex(t => t.tenantId === tenantId);
            if (index !== -1) {
              this.tenants[index].whatsAppBalance = res.data.whatsAppBalance;
              this.dataSource.data = [...this.tenants];
            }
             this.balanceAmounts[tenantId] = null;
            this.snackBar.open(`Balance updated successfully. New balance: ${res.data.whatsAppBalance ?? 'N/A'}`, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
            
            // Optional: Reload stats to update Total Balance card immediately
            this.loadStats(); 
          } else {
            this.snackBar.open(`Failed to update balance: ${res.message}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        },
        error: (err) => {
          this.snackBar.open(`Error updating balance: ${err.error?.message || err.message}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      });
  }

  toggleActiveStatus(tenant: Tenant): void {
    const newStatus = !tenant.isActive;
    this.isTogglingActive[tenant.tenantId] = true;

    this.tenantService.updateTenantActiveStatus(tenant.tenantId, newStatus)
      .pipe(finalize(() => this.isTogglingActive[tenant.tenantId] = false))
      .subscribe({
        next: (res) => {
          if (res.success) {
            const index = this.tenants.findIndex(t => t.tenantId === tenant.tenantId);
            if (index !== -1) {
              this.tenants[index].isActive = newStatus;
              this.dataSource.data = [...this.tenants];
            }
            this.snackBar.open(`Tenant ${tenant.tenantName} is now ${newStatus ? 'Active' : 'Inactive'}`, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
            
            // Reload stats to update Active Tenants count
            this.loadStats(); 
          } else {
            this.snackBar.open(`Failed to update status: ${res.message}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        },
        error: (err) => {
          this.snackBar.open(`Error updating status: ${err.error?.message || err.message}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      });
  }

  private checkAndLoadMore(): void {
    setTimeout(() => {
      if (!this.tableContainer || !this.hasMoreData || this.isLoading) {
        return;
      }
      const element = this.tableContainer.nativeElement;
      if (element.scrollHeight <= element.clientHeight) {
        this.loadTenants();
      }
    }, 100);
  }

  openGeneratePromoDialog(): void {
    const dialogRef = this.dialog.open(GeneratePromoDialogComponent, {
      width: '550px',
      disableClose: false 
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Result contains the payload from the form
        this.tenantService.generatePromoCode(result).subscribe({
          next: (res) => {
            if (res.success) {
              this.snackBar.open('Promo code generated successfully!', 'Close', { 
                duration: 3000, 
                panelClass: ['success-snackbar'] 
              });
            } else {
              this.snackBar.open(`Failed: ${res.message}`, 'Close', { 
                duration: 5000, 
                panelClass: ['error-snackbar'] 
              });
            }
          },
          error: (err) => {
            this.snackBar.open(`Error: ${err.error?.message || err.message}`, 'Close', { 
              duration: 5000, 
              panelClass: ['error-snackbar'] 
            });
          }
        });
      }
    });
  }
}