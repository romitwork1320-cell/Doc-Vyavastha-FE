import { AfterViewInit, Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenu, MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Clipboard } from '@angular/cdk/clipboard';
import { Subject, Subscription } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTooltipModule } from '@angular/material/tooltip';

import { QuotationService, QuotationListDto } from 'src/app/services/quotation.service';
import { GlobalImportExportService } from 'src/app/services/global-import-export.service';
import { GlobalSearchService } from 'src/app/services/global-search.service';
import { GlobalFilterService } from 'src/app/services/global-filter.service';
import { QuotationDialogComponent } from './quotation-dialog/quotation-dialog.component'; 
import { QuotationCompareDialogComponent } from './quotation-compare-dialog/quotation-compare-dialog.component';
import { SwipeableDirective } from 'src/app/common/directive/swipeable.directive';
import { PaginationRequestDto } from 'src/app/common/interfaces/common';
import { FabClickService } from 'src/app/services/fab-click.service';
import { ConfirmationDialogComponent, ConfirmationDialogData } from 'src/app/common/component/confirmation-dialog/confirmation-dialog.component';

// ❌ Removed PdfService import

@Component({
  selector: 'app-quotation-list',
  standalone: true,
  imports: [
    CommonModule, 
    MatTableModule, 
    MatSortModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatMenuModule,
    MatProgressSpinnerModule, 
    TablerIconsModule,
    SwipeableDirective,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatTooltipModule
  ],
  providers: [DatePipe],
  templateUrl: './quotation-list.component.html',
  styleUrls: ['./quotation-list.component.scss']
})
export class QuotationListComponent implements OnInit, AfterViewInit, OnDestroy {
  // Columns
  displayedColumns: string[] = ['select', 'id', 'title', 'amount', 'customer', 'date', 'actions'];
  dataSource: MatTableDataSource<QuotationListDto> = new MatTableDataSource<QuotationListDto>();
  selection = new SelectionModel<QuotationListDto>(true, []);
  
  // State
  isLoading: boolean = false;
  filterValue: string = '';
  swipedRowId: number | string | null = null; 
  public quotations: QuotationListDto[] = [];
  
  // Pagination
  private currentPage: number = 1;
  private pageSize: number = 20;
  private hasMoreData: boolean = true;

  // Filter Form
  filterForm = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
    minPrice: new FormControl<number | null>(null),
    maxPrice: new FormControl<number | null>(null),
  });

  private destroy$ = new Subject<void>();
  private searchSubscription: Subscription;
  private fabClickSubscription: Subscription;

  @ViewChild('tableContainer') tableContainer!: ElementRef;
  @ViewChild('filterMenu') filterMenu!: MatMenu; 

  @ViewChild(MatSort) set sort(sort: MatSort) {
    if (sort) {
      this.dataSource.sort = sort;
      sort.sortChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.resetAndLoadQuotations();
      });
    }
  }

  constructor(
    private quotationService: QuotationService,
    private dialog: MatDialog,
    private globalService: GlobalImportExportService,
    private globalSearchService: GlobalSearchService,
    private globalFilterService: GlobalFilterService,
    private clipboard: Clipboard,
    private snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef,
    private fabClickService: FabClickService
  ) {}

  ngOnInit(): void {
    // Search Listener
    this.searchSubscription = this.globalSearchService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe(query => {
        this.filterValue = query;
        this.resetAndLoadQuotations();
      });

    // FAB Listener
    this.fabClickSubscription = this.fabClickService.fabClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
         this.openDialog('Add');
      });

    // Initial Load
    if (!this.filterValue) {
       this.loadQuotations();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
        if (this.filterMenu) {
            this.globalFilterService.setFilterMenu(this.filterMenu);
            this.changeDetectorRef.detectChanges(); 
        }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.globalService.setCustomActionState({ text: '', icon: '', disabled: true });
    this.globalFilterService.clearFilterMenu();
  }


  applyFilters(): void {
    const val = this.filterForm.value;
    const isActive = !!(val.start || val.end || val.minPrice || val.maxPrice);
    
    if (this.globalFilterService.setFilterActive) {
        this.globalFilterService.setFilterActive(isActive);
    }

    this.resetAndLoadQuotations();
  }

  clearFilters(): void {
    this.filterForm.reset();
    if (this.globalFilterService.setFilterActive) {
        this.globalFilterService.setFilterActive(false);
    }
    this.resetAndLoadQuotations();
  }

  private resetAndLoadQuotations(): void {
    this.quotations = [];
    this.currentPage = 1;
    this.hasMoreData = true;
    this.dataSource.data = [];
    this.selection.clear();
    this.loadQuotations();
  }

  loadQuotations(): void {
    if (this.isLoading || !this.hasMoreData) return;
    this.isLoading = true;

    const formValues = this.filterForm.value;

    const request: PaginationRequestDto = {
      pageIndex: this.currentPage,
      pageSize: this.pageSize,
      sortColumn: this.dataSource.sort?.active || 'CreatedOn',
      sortDirection: (this.dataSource.sort?.direction || 'desc'),
      filter: this.filterValue,
      fromDate: formValues.start ? formValues.start.toISOString() : null,
      toDate: formValues.end ? formValues.end.toISOString() : null,
      minPrice: formValues.minPrice,
      maxPrice: formValues.maxPrice
    };

    this.quotationService.getQuotations(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res) => {
            if (res.success) {
                const newItems = res.data || [];
                if (this.currentPage === 1) {
                    this.quotations = newItems;
                    this.dataSource.data = this.quotations;
                } else {
                    this.quotations = [...this.quotations, ...newItems];
                    this.dataSource.data = this.quotations;
                }
                
                this.currentPage++;
                this.hasMoreData = newItems.length === this.pageSize;
                this.checkAndLoadMore();
            }
        },
        error: () => this.snackBar.open('Error loading quotations', 'Close', { duration: 3000 })
      });
  }

  onScroll(event: Event): void {
    if (!this.isLoading && this.hasMoreData) {
      const element = event.target as HTMLElement;
      if (element.scrollHeight - element.scrollTop - element.clientHeight <= 100) {
        this.loadQuotations();
      }
    }
  }

  private checkAndLoadMore(): void {
    setTimeout(() => {
      if (!this.tableContainer || !this.hasMoreData || this.isLoading) return;
      const element = this.tableContainer.nativeElement;
      if (element.scrollHeight <= element.clientHeight) {
        this.loadQuotations();
      }
    }, 100);
  }

  openDialog(action: string, row?: QuotationListDto): void {
  this.swipedRowId = null;
  const dialogRef = this.dialog.open(QuotationDialogComponent, {
    width: '1200px',
    panelClass: 'common-dialog',
    data: { action, id: row?.id }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result === true) {
       this.resetAndLoadQuotations();
    }
  });
}

  // ✅ UPDATED: Placeholder method to prevent errors
  downloadPdf(row: QuotationListDto) {
    this.snackBar.open('PDF Generation Coming Soon!', 'Close', { duration: 2000 });
  }

  duplicateQuotation(row: QuotationListDto): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.quotationService.duplicateQuotation(row.id)
      .subscribe({
        next: (res) => {
          this.isLoading = false; 
          if (res.success) {
            this.snackBar.open('Quotation duplicated successfully', 'OK', { duration: 3000, panelClass: 'success-snackbar' });
            this.resetAndLoadQuotations();
          } else {
            this.snackBar.open(res.message, 'Close', { duration: 3000 });
          }
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Error duplicating quotation', 'Close', { duration: 3000 });
        }
      });
  }

  deleteQuotation(row: QuotationListDto): void {
    // 1. Prepare Data for your existing Confirmation Dialog
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Quotation',
      message: `Are you sure you want to delete "${row.title || 'Custom Build'}"?`,
      subMessage: 'This action will move the quotation to the trash.',
      confirmButtonText: 'Delete',
      confirmButtonColor: 'warn',
      type: 'error'
    };

    // 2. Open the Dialog
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      data: dialogData,
      autoFocus: false
    });

    // 3. Handle Result
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.isLoading = true;

        this.quotationService.deleteQuotation(row.id) // Pass userId if available, else 0
          .pipe(finalize(() => this.isLoading = false))
          .subscribe({
            next: (res) => {
              if (res.success) {
                this.snackBar.open('Quotation deleted successfully', 'OK', { 
                  duration: 3000, 
                  panelClass: 'success-snackbar' 
                });

                // ✅ CRITICAL FIX: Local Update (Instant Feedback)
                // Remove the item from the local array immediately
                this.quotations = this.quotations.filter(q => q.id !== row.id);
                this.dataSource.data = [...this.quotations]; // Update DataSource
                this.selection.deselect(row); // Clear selection if it was selected

                // Edge Case: If table becomes empty, force a reload to get previous page or show empty state
                if (this.quotations.length === 0) {
                   this.resetAndLoadQuotations();
                }

              } else {
                this.snackBar.open(res.message || 'Failed to delete', 'Close', { 
                  duration: 3000, 
                  panelClass: 'error-snackbar' 
                });
              }
            },
            error: (err) => {
              console.error(err);
              this.snackBar.open('Error occurred while deleting', 'Close', { duration: 3000 });
            }
          });
      }
    });
  }

  copyWhatsApp(row: QuotationListDto): void {
    this.quotationService.getWhatsAppText(row.id).subscribe(res => {
      if (res.success && res.data) {
        this.clipboard.copy(res.data);
        this.snackBar.open('Copied to Clipboard!', 'OK', { duration: 2000, panelClass: 'success-snackbar' });
      }
    });
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.dataSource.data);
  }

  checkboxLabel(row?: QuotationListDto): string {
    return (!row)
      ? `${this.isAllSelected() ? 'deselect' : 'select'} all`
      : `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.id}`;
  }

  compareQuotations(): void {
    const selected = this.selection.selected;
    if (selected.length < 2) {
        this.snackBar.open('Select at least 2 quotations to compare', 'Close', { duration: 2000 });
        return;
    }
    if (selected.length > 3) {
        this.snackBar.open('You can compare max 3 items', 'Close', { duration: 2000 });
        return;
    }
    this.dialog.open(QuotationCompareDialogComponent, {
        maxWidth: '95vw', width: '1200px', panelClass: 'common-dialog',
        data: { ids: selected.map(s => s.id) }
    });
  }

  onSwipe(id: number | string, action: 'open' | 'close') {
    this.swipedRowId = action === 'open' ? id : null;
  }
}