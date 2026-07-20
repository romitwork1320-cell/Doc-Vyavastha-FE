import { Component, Inject, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DetailedReportPaginationRequestDto, ReplacedProductDetailsDto, ReportService } from 'src/app/services/report.service';
import { ApiResponse } from 'src/app/common/interfaces/common';
import { MaterialModule } from 'src/app/material.module';

// Dialog data interface to pass data to the dialog component
export interface ReportDetailsDialogData {
  customerName: string;
  contactId: number;
}

@Component({
  selector: 'app-report-details-dialog',
  templateUrl: './report-details-dialog.component.html',
  styleUrls: ['./report-details-dialog.component.scss'],
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
    MatDialogModule,
    DatePipe,
    MaterialModule, 
    ReactiveFormsModule
  ],
})
export class ReportDetailsDialogComponent implements OnInit {
  displayedColumns: string[] = ['#', 'productName', 'oldSerialNo', 'newSerialNo', 'replacedDate', 'serviceCenterName', 'status'];
  dataSource: MatTableDataSource<ReplacedProductDetailsDto> = new MatTableDataSource<ReplacedProductDetailsDto>();
  isLoading: boolean = false;
  filterValue: string = '';
  totalRecords: number = 0;
  
  public detailedData: ReplacedProductDetailsDto[] = [];
  private currentPage: number = 0;
  private pageSize: number = 10;
  private hasMoreData: boolean = true;
  private filterSubject = new Subject<string>();

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    public dialogRef: MatDialogRef<ReportDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReportDetailsDialogData,
    private reportService: ReportService,
    private snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Debounce the filter input
    this.filterSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(filterValue => {
      this.filterValue = filterValue;
      this.resetAndLoadDetails();
    });
    this.loadDetails();
  }

  // Handle infinite scrolling within the dialog
  onScroll(event: Event): void {
    if (!this.isLoading && this.hasMoreData) {
      const element = event.target as HTMLElement;
      const threshold = 100;
      if (element.scrollHeight - element.scrollTop - element.clientHeight <= threshold) {
        this.loadDetails();
      }
    }
  }

  onFilterChange(filterValue: string): void {
    this.filterSubject.next(filterValue);
  }

  private resetAndLoadDetails(): void {
    this.detailedData = [];
    this.currentPage = 0;
    this.hasMoreData = true;
    this.dataSource.data = [];
    this.loadDetails();
  }

  loadDetails(): void {
    if (this.isLoading || !this.hasMoreData) {
      return;
    }

    this.isLoading = true;

    const request: DetailedReportPaginationRequestDto = {
      pageIndex: this.currentPage,
      pageSize: this.pageSize,
      filter: this.filterValue,
      sortColumn: this.sort?.active,
      sortDirection: (this.sort?.direction || null) as 'asc' | 'desc' | null,
      contactId: this.data.contactId,
    };

    this.reportService.getDetailedReplacedProductReport(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: ApiResponse<ReplacedProductDetailsDto[]>) => {
          if (response.success) {
            const newRecords = response.data || [];
            this.detailedData = [...this.detailedData, ...newRecords];
            this.dataSource.data = this.detailedData;
            this.currentPage++;
            this.totalRecords = response.totalRecords ?? 0;
            this.hasMoreData = newRecords.length === this.pageSize;
          } else {
            this.snackBar.open(`Error: ${response.message}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        },
        error: (error) => {
          console.error('Failed to load detailed report:', error);
          this.snackBar.open('Failed to load detailed report. Please try again.', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      });
  }

  getStatusClasses(status: string): string {
    if (!status) return '';
    // Converts "In Progress" -> "in-progress", "Pending" -> "pending"
    return status.toLowerCase().trim().replace(/\s+/g, '-');
  }

  closeDialog(): void {
    this.dialogRef.close({ event: 'Cancel' });
  }
}