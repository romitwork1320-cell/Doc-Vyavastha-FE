import { Component, Inject, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatButtonModule } from '@angular/material/button';

import { ReportService, ReportPaginationRequestDto, ServiceCenterProductDetailsDto } from 'src/app/services/report.service';
import { ApiResponse } from 'src/app/common/interfaces/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';

@Component({
  selector: 'app-service-center-product-details-dialog',
  templateUrl: './service-center-product-details-dialog.component.html',
  styleUrls: ['./service-center-product-details-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    TablerIconsModule,
    MatButtonModule,
    FormsModule,
    MatDialogModule,
    DatePipe,
    MaterialModule, 
    ReactiveFormsModule
  ]
})
export class ServiceCenterProductDetailsDialogComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['#', 'productName', 'serialNo', 'createdDate'];
  dataSource: MatTableDataSource<ServiceCenterProductDetailsDto> = new MatTableDataSource<ServiceCenterProductDetailsDto>();
  isLoading: boolean = false;
  
  private currentPage: number = 0;
  private pageSize: number = 10;
  private hasMoreData: boolean = true;
  public totalRecords: number = 0;
  private filterSubject = new Subject<string>();
  public filterValue: string = '';

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      serviceCenterId: number,
      productStatusId: number,
      startDate: string | null,
      endDate: string | null
    },
    public dialogRef: MatDialogRef<ServiceCenterProductDetailsDialogComponent>,
    private reportService: ReportService,
    private snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.filterSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(filterValue => {
      this.filterValue = filterValue;
      this.resetAndLoadReport();
    });
    this.loadProductDetails();
  }

  ngAfterViewInit(): void {
    if (this.sort) {
      this.dataSource.sort = this.sort;
      this.sort.sortChange.subscribe(() => {
        this.resetAndLoadReport();
      });
    }
    this.changeDetectorRef.detectChanges();
  }

  onScroll(event: Event): void {
    if (!this.isLoading && this.hasMoreData) {
      const element = event.target as HTMLElement;
      const threshold = 100;
      if (element.scrollHeight - element.scrollTop - element.clientHeight <= threshold) {
        this.loadProductDetails();
      }
    }
  }

  onFilterChange(filterValue: string): void {
    this.filterSubject.next(filterValue);
  }

  private resetAndLoadReport(): void {
    this.dataSource.data = [];
    this.currentPage = 0;
    this.hasMoreData = true;
    this.totalRecords = 0;
    this.loadProductDetails();
  }

  private loadProductDetails(): void {
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
      startDate: this.data.startDate,
      endDate: this.data.endDate
    };

    this.reportService.getServiceCenterProductDetails(this.data.serviceCenterId, this.data.productStatusId, request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: ApiResponse<ServiceCenterProductDetailsDto[]>) => {
          if (response.success) {
            const newRecords = response.data || [];
            this.dataSource.data = [...this.dataSource.data, ...newRecords];
            this.currentPage++;
            this.hasMoreData = newRecords.length === this.pageSize;
            this.totalRecords = response.totalRecords || 0;
          } else {
            this.snackBar.open(`Error: ${response.message}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        },
        error: (error) => {
          console.error('Failed to load product details:', error);
          this.snackBar.open('Failed to load product details. Please try again.', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}