import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectorRef, Input, OnDestroy } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, debounceTime, distinctUntilChanged, takeUntil, skip } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { RouterLink } from '@angular/router';

import { ApiResponse, PaginationRequestDto } from 'src/app/common/interfaces/common';
import { CustomerReplacementReportDto, ReportPaginationRequestDto, ReportService } from 'src/app/services/report.service';
import { ReportDetailsDialogComponent } from './report-details-dialog/report-details-dialog.component';
import { GlobalSearchService } from 'src/app/services/global-search.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-customer-replacement-report',
  templateUrl: './customer-replacement-report.component.html',
  styleUrls: ['./customer-replacement-report.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, TablerIconsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatIconModule, MatButtonModule, MatTableModule, MatSortModule,
    MatProgressSpinnerModule, MatDatepickerModule, MatNativeDateModule, RouterLink
  ]
})
export class CustomerReplacementReportComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() title: string = 'Customer Replacement Report'; // Use an Input for the title

  displayedColumns: string[] = ['#', 'name', 'contactNo', 'replacementVolume'];
  dataSource: MatTableDataSource<CustomerReplacementReportDto> = new MatTableDataSource<CustomerReplacementReportDto>();
  isLoading: boolean = false;
  filterValue: string = '';
  
  startDate: Date | null = null;
  endDate: Date | null = null;

  public reportData: CustomerReplacementReportDto[] = [];
  private currentPage: number = 0;
  private pageSize: number = 15;
  private hasMoreData: boolean = true;

  private destroy$ = new Subject<void>();
  private searchSubscription: Subscription;

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private reportService: ReportService,
    private snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef,
    public dialog: MatDialog,
    private globalSearchService: GlobalSearchService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.searchSubscription = this.globalSearchService.searchQuery$
      .pipe(
        takeUntil(this.destroy$),
        skip(1),
        debounceTime(400), // Debounce here just in case
        distinctUntilChanged()
      )
      .subscribe(query => {
        this.filterValue = query;
        this.resetAndLoadReport();
      });

    this.authService.activeBranchId$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged()
    ).subscribe(branchId => {
      if (branchId) {
        this.resetAndLoadReport();
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.sort.sortChange
      .pipe(takeUntil(this.destroy$)) // <-- ADDED takeUntil
      .subscribe(() => {
        this.resetAndLoadReport();
      });
    this.changeDetectorRef.detectChanges();
    this.loadReport();
  }

  // --- ADDED OnDestroy ---
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDateRangeChange(): void {
    this.resetAndLoadReport();
  }

  onScroll(event: Event): void {
    if (!this.isLoading && this.hasMoreData) {
      const element = event.target as HTMLElement;
      const threshold = 100;
      if (element.scrollHeight - element.scrollTop - element.clientHeight <= threshold) {
        this.loadReport();
      }
    }
  }

  private resetAndLoadReport(): void {
    this.reportData = [];
    this.currentPage = 0;
    this.hasMoreData = true;
    this.dataSource.data = [];
    this.loadReport();
  }

  loadReport(): void {
    if (this.isLoading || !this.hasMoreData) {
      return;
    }
    this.isLoading = true;
    const request: ReportPaginationRequestDto = {
      pageIndex: this.currentPage,
      pageSize: this.pageSize,
      filter: this.filterValue,
      sortColumn: this.sort?.active,
      sortDirection: (this.sort?.direction || null) as 'asc' | 'desc' | null,
      startDate: this.startDate?.toISOString(),
      endDate: this.endDate?.toISOString()
    };
    this.reportService.getCustomerReplacementVolumeReport(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: ApiResponse<CustomerReplacementReportDto[]>) => {
          if (response.success) {
            const newRecords = response.data || [];
            this.reportData = [...this.reportData, ...newRecords];
            this.dataSource.data = this.reportData;
            this.currentPage++;
            this.hasMoreData = newRecords.length === this.pageSize;
          } else {
            this.snackBar.open(`Error: ${response.message}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        },
        error: (error) => {
          console.error('Failed to load report:', error);
          this.snackBar.open('Failed to load report. Please try again.', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      });
  }

  openDetailsDialog(customer: CustomerReplacementReportDto): void {
    const dialogRef = this.dialog.open(ReportDetailsDialogComponent, {
      width: '1300px',
      data: { customerName: customer.name, contactId: customer.id }
    });
  }
}