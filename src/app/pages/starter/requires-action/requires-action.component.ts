import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { DashboardService, RequiresActionDto } from 'src/app/services/dashboard.service'; 
import { PaginationRequestDto } from 'src/app/common/interfaces/common';
import { finalize, takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReplacementProductService } from 'src/app/services/replacement-product.service';
import { DialogData, ReplacementProductDialogComponent } from '../../replacement-products/replacement-product-dialog/replacement-product-dialog.component';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-requires-action',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconsModule],
  templateUrl: './requires-action.component.html',
  styleUrls: ['./requires-action.component.scss']
})
export class AppRequiresActionComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['invertNo', 'customer', 'age', 'action'];
  dataSource: RequiresActionDto[] = [];
  
  @ViewChild('tableContainer') tableContainer!: ElementRef;

  // Pagination & Loading State
  isLoading: boolean = false;
  currentPage: number = 0;
  pageSize: number = 10;
  hasMoreData: boolean = true;

  // Added Subject for memory management
  private destroy$ = new Subject<void>();

  constructor(
    private dashboardService: DashboardService,
    private replacementProductService: ReplacementProductService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAlerts();

    // Listen for background saves from the Dialog 
    // (Fires if the user clicks "Complete" but leaves the dialog open)
    this.dashboardService.activityUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.dataSource = [];
        this.currentPage = 0;
        this.hasMoreData = true;
        this.loadAlerts();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAlerts(): void {
    if (this.isLoading || !this.hasMoreData) {
      return;
    }

    this.isLoading = true;

    const request: PaginationRequestDto = {
      pageIndex: this.currentPage,
      pageSize: this.pageSize,
      filter: '',
      sortColumn: '',
      sortDirection: null
    };

    this.dashboardService.getRequiresActionAlerts(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const newAlerts = response.data || [];
            
            // Append new data to existing array
            this.dataSource = [...this.dataSource, ...newAlerts];
            this.currentPage++;
            
            // Check if we've reached the end of the data
            this.hasMoreData = newAlerts.length === this.pageSize;
            
            // If the container isn't full yet, load more automatically
            this.checkAndLoadMore();
          }
        },
        error: (err) => {
          console.error('Error fetching SLA alerts:', err);
        }
      });
  }

  onScroll(event: Event): void {
    if (!this.isLoading && this.hasMoreData) {
      const element = event.target as HTMLElement;
      const threshold = 100; // Trigger load when 100px from the bottom
      if (element.scrollHeight - element.scrollTop - element.clientHeight <= threshold) {
        this.loadAlerts();
      }
    }
  }

  private checkAndLoadMore(): void {
    // Wait a tick for the DOM to update with the new rows
    setTimeout(() => {
      if (!this.tableContainer || !this.hasMoreData || this.isLoading) {
        return;
      }

      const element = this.tableContainer.nativeElement;
      // If the content height is less than or equal to the container height, 
      // it means there is no scrollbar yet. Load more!
      if (element.scrollHeight <= element.clientHeight) {
        this.loadAlerts();
      }
    }, 100);
  }

  resolve(invertNo: string): void {
    if (!invertNo) return;
    
    this.isLoading = true; 
    
    // Fetch the full details needed for the update dialog
    this.replacementProductService.getReplacementProductsByInvertNo(invertNo)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          if (response.success && response.data && response.data.length > 0) {
            const product = response.data[0]; 
            this.openDialog('Update', product);
          } else {
            this.snackBar.open(`Could not find details for ${invertNo}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Error opening record details.', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      });
  }

  openDialog(action: string, replacementProduct: any): void {
    const dialogData: DialogData = {
      action: action,
      replacement: {
        id: replacementProduct.id,
        invertNo: replacementProduct.invertNo,
        contact: {
          id: replacementProduct.contactId ?? 0,
          name: replacementProduct.contactName || '',
          contactNo: replacementProduct.contactNo || '',
          isActive: true,
        },
        replacedItems: []
      }
    };

    const dialogRef = this.dialog.open(ReplacementProductDialogComponent, {
      width: '1300px',
      data: dialogData,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((result) => {
      // ONLY execute if the user actually saved changes (Ignore 'Cancel')
      if (result && result.event !== 'Cancel') {
        
        // 1. INSTANT LOCAL REFRESH: Make the table feel lightning fast
        this.dataSource = [];
        this.currentPage = 0;
        this.hasMoreData = true;
        this.loadAlerts();

        // 2. DELAYED ACTIVITY REFRESH: Give the C# database time to write the audit log!
        // We are waiting 2.5 seconds (2500ms) before asking for the logs.
        setTimeout(() => {
          this.dashboardService.notifyActivityUpdate();
        }, 2500); 
      }
    });
  }
}