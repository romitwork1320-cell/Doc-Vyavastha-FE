import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs'; // ✅ Added Tabs
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subject, finalize, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmationDialogComponent } from 'src/app/common/component/confirmation-dialog/confirmation-dialog.component';
import { ReplacementProductService, ReplacementProduct, FieldExecutiveUpdateDto } from 'src/app/services/replacement-product.service';
import { AuthService } from 'src/app/services/auth.service';
import { ApiResponse, PaginationRequestDto } from 'src/app/common/interfaces/common';
import { FieldHandoverDialogComponent } from './field-handover-dialog/field-handover-dialog.component';
import { FieldReadyDialogComponent } from './field-ready-dialog/field-ready-dialog.component';

@Component({
  selector: 'app-field-executive-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatSortModule, MatCardModule, 
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, 
    MatTooltipModule, TablerIconsModule, MatTabsModule,
    MatFormFieldModule, MatInputModule
  ],
  templateUrl: './field-executive-dashboard.component.html',
  styleUrls: ['./field-executive-dashboard.component.scss'],
  providers: [DatePipe]
})
export class FieldExecutiveDashboardComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['#', 'InvertNo', 'ProductName', 'ServiceCenterName', 'Status', 'Action'];
  
  // 3 Separate Data Sources
  dataSourcePickup = new MatTableDataSource<ReplacementProduct>();
  dataSourceTransit = new MatTableDataSource<ReplacementProduct>();
  dataSourceCollect = new MatTableDataSource<ReplacementProduct>();

  pickupCount = 0;
  transitCount = 0;
  collectCount = 0;

  isLoading = false;
  currentUserId = 0;
  filterValue: string = '';
  private filterSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private replacementService: ReplacementProductService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const userId = this.authService.getUserId();
    if (userId) this.currentUserId = userId;

    this.loadData();

    this.filterSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(val => {
      this.filterValue = val;
      // Apply filter to all sources
      this.dataSourcePickup.filter = val.trim().toLowerCase();
      this.dataSourceTransit.filter = val.trim().toLowerCase();
      this.dataSourceCollect.filter = val.trim().toLowerCase();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.isLoading = true;
    
    // Fetch ALL active logistics items (Pending/InProgress)
    const request: PaginationRequestDto = {
      pageIndex: 0, pageSize: 500, // Fetch more to process locally
      filter: '', sortColumn: 'InvertNo', sortDirection: 'desc'
    };

    this.replacementService.getLogisticsProducts(request)
      .pipe(finalize(() => this.isLoading = false), takeUntil(this.destroy$))
      .subscribe({
        next: (res: ApiResponse<ReplacementProduct[]>) => {
          if (res.success && res.data) {
            this.processData(res.data);
          }
        },
        error: (err) => console.error(err)
      });
  }

  processData(allData: ReplacementProduct[]) {
    // 1. Pickups: Pending AND Unassigned
    const pickups = allData.filter(d => 
      d.groupStatus === 'Pending' && !d.assignedToUserId
    );

    // 2. In Transit: Pending AND Assigned to Me
    const transit = allData.filter(d => 
      d.groupStatus === 'Pending' && d.assignedToUserId === this.currentUserId
    );

    // 3. To Collect: In Progress (Any User)
    const collect = allData.filter(d => 
      d.groupStatus === 'In Progress' || d.groupStatus === 'In-Progress'
    );

    // Bind Data
    this.dataSourcePickup.data = pickups;
    this.dataSourceTransit.data = transit;
    this.dataSourceCollect.data = collect;

    // Update Counts
    this.pickupCount = pickups.length;
    this.transitCount = transit.length;
    this.collectCount = collect.length;
  }

  onFilterChange(value: string) {
    this.filterSubject.next(value);
  }

  onTabChange(event: any) {
    // Optional: Refresh data when switching tabs if needed
    // this.loadData(); 
  }

  // --- ACTIONS ---

  onPickup(item: ReplacementProduct) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px', // Matches the width of your other dialogs
      data: {
        title: 'Confirm Pickup',
        message: 'Are you sure you want to confirm the pickup for this item?',
        // ✅ NEW: Use the subMessage for specific details (shows in the colored box)
        subMessage: `Invert No: ${item.invertNo}`, 
        confirmText: 'Pickup',
        confirmColor: 'accent', // This will trigger the Accent/Yellow styling
        icon: 'truck-loading'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.executeUpdate(item, 1);
      }
    });
  }

  onHandover(item: ReplacementProduct) {
    // 1. Find other items currently at THIS Service Center
    const otherItemsAtLocation = this.dataSourceCollect.data.filter(d => 
      d.serviceCenterName === item.serviceCenterName && 
      d.invertNo !== item.invertNo // Exclude the current item
    );

    const ref = this.dialog.open(FieldHandoverDialogComponent, {
      width: '500px', // Slightly wider to fit the list
      data: { 
        invertNo: item.invertNo,
        serviceCenterName: item.serviceCenterName, // Pass the name for context
        otherItems: otherItemsAtLocation // ✅ Pass the list of potential pickups
      },
      disableClose: true
    });

    ref.afterClosed().subscribe(res => {
      if (res) {
        const dto: FieldExecutiveUpdateDto = {
          id: item.id,
          invertNo: item.invertNo!,
          actionType: 2,
          userId: this.currentUserId,
          statusId: res.statusId,
          serviceInvoiceNo: res.serviceInvoiceNo,
          tentativeDate: res.tentativeDate
        };
        this.sendUpdate(dto);
      }
    });
  }

  onRelease(item: ReplacementProduct) {
    if(confirm(`Are you sure you want to release ${item.invertNo}? It will be available for others to pick up.`)) {
       this.executeUpdate(item, 4); // Action Type 4 = Release
    }
  }

  onMarkReady(item: ReplacementProduct) {
    const dialogRef = this.dialog.open(FieldReadyDialogComponent, {
      width: '1200px',
      data: { productName: item.productName, invertNo: item.invertNo },
      disableClose: false
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        const dto: FieldExecutiveUpdateDto = {
          id: item.id,
          invertNo: item.invertNo!,
          actionType: 3,
          userId: this.currentUserId,
          productStatusId: res.productStatusId,
          newSerialNo: res.newSerialNo,
          isUpgraded: res.isUpgraded,
          upgradedProductId: res.upgradedProductId,
          notes: res.notes
        };
        this.sendUpdate(dto);
      }
    });
  }

  private executeUpdate(item: ReplacementProduct, type: number) {
    const dto: FieldExecutiveUpdateDto = { id: item.id!, invertNo: item.invertNo!, actionType: type, userId: this.currentUserId };
    this.sendUpdate(dto);
  }

  private sendUpdate(dto: FieldExecutiveUpdateDto) {
    this.isLoading = true;
    this.replacementService.updateFieldExecutiveStatus(dto)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.snackBar.open(res.message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
            this.loadData(); // Refresh all lists
          } else {
            this.snackBar.open(res.message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        },
        error: () => this.snackBar.open('Update failed', 'Close', { panelClass: ['error-snackbar'] })
      });
  }

  getStatusClass(status: string): string {
    return status?.toLowerCase().replace(/\s/g, '-') || '';
  }
}