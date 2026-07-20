import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectorRef, ViewEncapsulation, OnDestroy, ElementRef } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, debounceTime, distinctUntilChanged, takeUntil, skip } from 'rxjs/operators';
import { forkJoin, Subject, Subscription } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReportService, ReportPaginationRequestDto, ServiceCenterReportDto, ServiceCenterProductDetailsDto, PendingReportProductDto, InProgressReportProductDto, ReadyReportProductDto, CompletedReportProductDto } from 'src/app/services/report.service';
import { ApiResponse } from 'src/app/common/interfaces/common';
import { ServiceCenterProductDetailsDialogComponent } from './service-center-product-details-dialog/service-center-product-details-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { SelectionModel } from '@angular/cdk/collections';
import jsPDF from 'jspdf';
import autoTable, { RowInput } from "jspdf-autotable";
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { MaterialModule } from 'src/app/material.module';
import { MatMenuModule } from '@angular/material/menu';
import { animate, style, transition, trigger } from '@angular/animations';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MomentDateAdapter } from '@angular/material-moment-adapter';
import { CompanyProfileDto, ProfileService } from 'src/app/services/profile.service';
import { GlobalImportExportService } from 'src/app/services/global-import-export.service';
import { GlobalSearchService } from 'src/app/services/global-search.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SwipeableDirective } from 'src/app/common/directive/swipeable.directive';
import { AuthService } from 'src/app/services/auth.service';

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'LL',
  },
  display: {
    dateInput: 'DD-MM-YYYY', // Changed to the format you requested
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-service-center-report',
  templateUrl: './service-center-report.component.html',
  styleUrls: ['./service-center-report.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TablerIconsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatButtonModule,
    MatTabsModule,
    MaterialModule,
    MatMenuModule, 
    ReactiveFormsModule,
    MatTooltipModule,
    SwipeableDirective
  ],
  animations: [
    trigger('tabSlide', [
      // Animation for when the user clicks a tab to the right (index increases)
      transition(':increment', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      // Animation for when the user clicks a tab to the left (index decreases)
      transition(':decrement', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ])
    ])
  ],
   providers: [
    DatePipe,
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }, // Use a locale that defaults to DD/MM/YYYY
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS],
    },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
  ],
})
export class ServiceCenterReportComponent implements OnInit, AfterViewInit, OnDestroy {
  // --- Data for Summary Tabs ("All", "In Progress", etc.) ---
  summaryDisplayedColumns: string[] = ['select', '#', 'serviceCenterName', 'status', 'totalCount', 'pdf'];
  summaryDataSource: MatTableDataSource<ServiceCenterReportDto> = new MatTableDataSource<ServiceCenterReportDto>();
  public summaryReportData: ServiceCenterReportDto[] = [];

  // --- Data for "Pending" Tab ---
  pendingDisplayedColumns: string[] = ['select', '#', 'iwNo', 'productName', 'warranty', 'serviceCenterName', 'pdf'];
  pendingDataSource: MatTableDataSource<PendingReportProductDto> = new MatTableDataSource<PendingReportProductDto>();
  public pendingReportData: PendingReportProductDto[] = [];

  inProgressDisplayedColumns: string[] = ['select', '#', 'iwNo', 'productName', 'serviceInvoiceNo', 'serviceCenterName', 'updatedDate', 'pdf'];
  inProgressDataSource: MatTableDataSource<InProgressReportProductDto> = new MatTableDataSource<InProgressReportProductDto>();
  public inProgressReportData: InProgressReportProductDto[] = [];

  readyDisplayedColumns: string[] = ['select', '#', 'iwNo', 'productName', 'customer', 'productStatusName', 'serviceCenterName', 'updatedDate', 'pdf'];
  readyDataSource: MatTableDataSource<ReadyReportProductDto> = new MatTableDataSource<ReadyReportProductDto>();
  public readyReportData: ReadyReportProductDto[] = [];

  completedDisplayedColumns: string[] = ['select', '#', 'iwNo', 'productName', 'customer', 'productStatusName', 'serviceInvoiceNo', 'serviceCenterName', 'completedDate', 'notes', 'pdf'];
  completedDataSource: MatTableDataSource<CompletedReportProductDto> = new MatTableDataSource<CompletedReportProductDto>();
  public completedReportData: CompletedReportProductDto[] = [];

  // --- Common Properties ---
  isLoading: boolean = false;
  filterValue: string = '';
  
  public reportData: ServiceCenterReportDto[] = [];
  public currentPage: number = 0;  
  public pageSize: number = 15;
  private hasMoreData: boolean = true;
  private filterSubject = new Subject<string>();

  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  allStatuses = [
    { name: 'All', icon: 'list-details' },
    { name: 'Pending', icon: 'clock-hour-4' },
    { name: 'In Progress', icon: 'refresh' },
    { name: 'Ready', icon: 'circle-check' },
    { name: 'Completed', icon: 'checks' }
  ];

  statuses: any[] = [];
  selectedStatus: string = 'All';
  selectedTabIndex: number = 0;
  swipedRowId: number | string | null = null;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('dateRangeStart') dateRangeStartInput: ElementRef<HTMLInputElement>;

  selection = new SelectionModel<any>(true, []);
  isPdfLoading = false;

  private companyProfile: CompanyProfileDto | null = null;

  private destroy$ = new Subject<void>();
  private searchSubscription: Subscription;
  private customActionSubscription: Subscription;
  private themeColor: [number, number, number] = [0, 0, 0];
  private dangerColor: [number, number, number] = [220, 53, 69];

  constructor(
    private reportService: ReportService,
    private snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef,
    public dialog: MatDialog,
    private datePipe: DatePipe,
    private profileService: ProfileService,
    private globalSearchService: GlobalSearchService,
    private globalImportExportService: GlobalImportExportService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCompanyProfile();

    const role = this.authService.getUserRole(); //

    if (role === 'Field Executive') {
      // Filter: Only allow 'Pending' and 'In Progress'
      this.statuses = this.allStatuses.filter(s => s.name === 'Pending' || s.name === 'In Progress');
      
      // Set Default: Must be 'Pending' because 'All' is removed
      this.selectedStatus = 'Pending';
    } else {
      // Default: Show all tabs
      this.statuses = [...this.allStatuses];
      this.selectedStatus = 'All';
    }

    // 1. Listen for search text from the global header
    this.searchSubscription = this.globalSearchService.searchQuery$
      .pipe(
        takeUntil(this.destroy$),
        skip(1)
      )
      .subscribe(query => {
        // This just sets the value. The existing debounce logic will handle the rest.
        this.filterSubject.next(query);
      });

    // 3. Listen for clicks on that custom button
    this.customActionSubscription = this.globalImportExportService.customActionClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.generatePdf(); // Call your existing PDF function
      });
      
    // 4. Update the button's text/disabled state when selection changes
    this.selection.changed.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.globalImportExportService.setCustomActionState({
        text: `Download Selected PDF (${this.selection.selected.length})`,
        icon: 'file-type-pdf',
        disabled: this.selection.isEmpty()
      });
    });
    
    // 5. Your existing filter logic
    this.filterSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(filterValue => {
      this.filterValue = filterValue;
      this.resetAndLoadData();
    });

    this.authService.activeBranchId$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged()
    ).subscribe(branchId => {
      if (branchId) {
        this.resetAndLoadData();
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.sort) {
      this.sort.sortChange.subscribe(() => {
        this.resetAndLoadData();
      });
    }
    this.changeDetectorRef.detectChanges();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Hide the custom button when leaving the page
    this.globalImportExportService.hide();
  }

  private loadCompanyProfile(): void {
    this.profileService.getProfile().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.companyProfile = response.data.companyProfile;
        } else {
          console.error('Failed to load company profile:', response.message);
          this.snackBar.open('Could not load company info for PDF.', 'Close', { duration: 3000 });
        }
      },
      error: (err) => {
        console.error('Error loading company profile:', err);
        this.snackBar.open('Error loading company info.', 'Close', { duration: 3000 });
      }
    });
  }

  onDateChange(): void {
    if (this.range.value.start && this.range.value.end) {
      this.resetAndLoadData();
    }
  }

  clearDateRange(): void {
    this.range.reset(); 
    this.resetAndLoadData(); 
  }

  onTabChange(event: MatTabChangeEvent): void {
    this.swipedRowId = null;
    this.selectedTabIndex = event.index;
    this.selectedStatus = this.statuses[event.index].name;

    if (this.selectedStatus === 'All' && this.summaryReportData.length > 0) {
      return; // Already have data
    }
    if (this.selectedStatus === 'Pending' && this.pendingReportData.length > 0) {
      return; // Already have data
    }
    if (this.selectedStatus === 'In Progress' && this.inProgressReportData.length > 0) {
      return; // Already have data
    }
    if (this.selectedStatus === 'Ready' && this.readyReportData.length > 0) {
      return; // Already have data
    }
    if (this.selectedStatus === 'Completed' && this.completedReportData.length > 0) {
      return; // Already have data
    }
    
    // Reset and load data for the new tab
    this.resetAndLoadData();
  }

  onScroll(event: Event): void {
    if (!this.isLoading && this.hasMoreData) {
      const element = event.target as HTMLElement;
      const threshold = 100;
      if (element.scrollHeight - element.scrollTop - element.clientHeight <= threshold) {
        this.loadData(); // <-- Call new function
      }
    }
  }

  onFilterChange(filterValue: string): void {
    this.filterSubject.next(filterValue);
  }

  private resetAndLoadData(): void {
    this.currentPage = 0;
    this.hasMoreData = true;
    this.selection.clear();
  
    this.loadData();
  }

  private buildRequest(): ReportPaginationRequestDto {
    const startDate = this.range.value.start;
    const endDate = this.range.value.end;

    return {
      pageIndex: this.currentPage,
      pageSize: this.pageSize,
      filter: this.filterValue,
      sortColumn: this.sort?.active,
      sortDirection: (this.sort?.direction || null) as 'asc' | 'desc' | null,
      status: this.selectedStatus === 'All' ? null : this.selectedStatus,
      startDate: startDate ? startDate.toISOString() : undefined,
      endDate: endDate ? endDate.toISOString() : undefined,
    };
  }

  /** Loads data for the currently selected tab. */
  private loadData(): void {
    if (this.isLoading || !this.hasMoreData) {
      return;
    }

    if (this.selectedStatus === 'Pending') {
      this.loadPendingReport();
    } else if (this.selectedStatus === 'In Progress') { 
      this.loadInProgressReport();
    } else if (this.selectedStatus === 'Ready') { 
      this.loadReadyReport();
    } else if (this.selectedStatus === 'Completed') {
      this.loadCompletedReport();
    } else {
      this.loadSummaryReport();
    }
  }

  /** Loads the detailed list for the "Pending" tab. */
  private loadPendingReport(): void {
    this.isLoading = true;
    const request = this.buildRequest();
    // We don't need to send status for the dedicated pending endpoint
    request.status = undefined; 

    this.reportService.getPendingReport(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: ApiResponse<PendingReportProductDto[]>) => {
          if (response.success) {
            const newRecords = response.data || [];
            this.pendingReportData = (this.currentPage === 0) 
              ? newRecords 
              : [...this.pendingReportData, ...newRecords];
            this.pendingDataSource.data = this.pendingReportData;
            if (this.sort) {
              this.pendingDataSource.sort = this.sort;
            }
            
            this.currentPage++;
            this.hasMoreData = newRecords.length === this.pageSize;
          } else {
            this.snackBar.open(`Error: ${response.message}`, 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.snackBar.open('Failed to load pending report. Please try again.', 'Close', { duration: 5000 });
        }
      });
  }

  private loadInProgressReport(): void {
    this.isLoading = true;
    const request = this.buildRequest();
    request.status = undefined; // Not needed for the dedicated endpoint

    this.reportService.getInProgressReport(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: ApiResponse<InProgressReportProductDto[]>) => {
          if (response.success) {
            const newRecords = response.data || [];
            this.inProgressReportData = (this.currentPage === 0) 
              ? newRecords 
              : [...this.inProgressReportData, ...newRecords];
            this.inProgressDataSource.data = this.inProgressReportData;
            if (this.sort) {
              this.inProgressDataSource.sort = this.sort;
            }
            
            this.currentPage++;
            this.hasMoreData = newRecords.length === this.pageSize;
          } else {
            this.snackBar.open(`Error: ${response.message}`, 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.snackBar.open('Failed to load in-progress report. Please try again.', 'Close', { duration: 5000 });
        }
      });
  }

  /** Loads the detailed list for the "Ready" tab. */
  private loadReadyReport(): void {
    this.isLoading = true;
    const request = this.buildRequest();
    request.status = undefined; // Not needed for the dedicated endpoint

    this.reportService.getReadyReport(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: ApiResponse<ReadyReportProductDto[]>) => {
          if (response.success) {
            const newRecords = response.data || [];
            this.readyReportData = (this.currentPage === 0) 
              ? newRecords 
              : [...this.readyReportData, ...newRecords];
            this.readyDataSource.data = this.readyReportData;
            if (this.sort) {
              this.readyDataSource.sort = this.sort;
            }
            
            this.currentPage++;
            this.hasMoreData = newRecords.length === this.pageSize;
          } else {
            this.snackBar.open(`Error: ${response.message}`, 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.snackBar.open('Failed to load ready report. Please try again.', 'Close', { duration: 5000 });
        }
      });
  }

  /** Loads the detailed list for the "Completed" tab. */
  private loadCompletedReport(): void {
    this.isLoading = true;
    const request = this.buildRequest();
    request.status = undefined; // Not needed for the dedicated endpoint

    this.reportService.getCompletedReport(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: ApiResponse<CompletedReportProductDto[]>) => {
          if (response.success) {
            const newRecords = response.data || [];
            this.completedReportData = (this.currentPage === 0) 
              ? newRecords 
              : [...this.completedReportData, ...newRecords];
            this.completedDataSource.data = this.completedReportData;
            if (this.sort) {
              this.completedDataSource.sort = this.sort;
            }
            
            this.currentPage++;
            this.hasMoreData = newRecords.length === this.pageSize;
          } else {
            this.snackBar.open(`Error: ${response.message}`, 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.snackBar.open('Failed to load completed report. Please try again.', 'Close', { duration: 5000 });
        }
      });
  }

  /** Loads the summary report for "All", "In Progress", "Ready", "Completed". */
  private loadSummaryReport(): void {
    this.isLoading = true;
    const request = this.buildRequest();

    this.reportService.getServiceCenterReport(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: ApiResponse<ServiceCenterReportDto[]>) => {
          if (response.success) {
            const newRecords = response.data || [];
            this.summaryReportData = (this.currentPage === 0)
              ? newRecords
              : [...this.summaryReportData, ...newRecords];
            this.summaryDataSource.data = this.summaryReportData;
            if (this.sort) {
              this.summaryDataSource.sort = this.sort;
            }

            this.currentPage++;
            this.hasMoreData = newRecords.length === this.pageSize;
          } else {
            this.snackBar.open(`Error: ${response.message}`, 'Close', { duration: 5000 });
          }
        },
        error: (error) => {
          this.snackBar.open('Failed to load report. Please try again.', 'Close', { duration: 5000 });
        }
      });
  }

  openProductDetailsDialog(row: ServiceCenterReportDto): void {
    this.swipedRowId = null;
    // This dialog is only for the "All" tab.
    if (this.selectedStatus !== 'All') {
      return; 
    }

    const startDate = this.range.value.start;
    const endDate = this.range.value.end;

    const dialogRef = this.dialog.open(ServiceCenterProductDetailsDialogComponent, {
      width: '1200px',
      data: {
        serviceCenterId: row.serviceCenterId,
        productStatusId: row.productStatusId,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null
      }
    });

    // --- THIS IS THE NEW LOGIC ---
    // When the dialog closes, focus the date range input.
    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.dateRangeStartInput?.nativeElement.focus();
    });
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    let numRows = 0;

    if (this.selectedStatus === 'Pending') {
      numRows = this.pendingDataSource.data.length;
    } else if (this.selectedStatus === 'In Progress') {
      numRows = this.inProgressDataSource.data.length;
    } else if (this.selectedStatus === 'Ready') { 
      numRows = this.readyDataSource.data.length;
    } else if (this.selectedStatus === 'Completed') { 
      numRows = this.completedDataSource.data.length;
    } else {
      numRows = this.summaryDataSource.data.length;
    }
    
    return numSelected === numRows;
  }

  toggleAllRows(): void {
    let dataSource: any[] = [];

    if (this.selectedStatus === 'Pending') {
      dataSource = this.pendingDataSource.data;
    } else if (this.selectedStatus === 'In Progress') {
      dataSource = this.inProgressDataSource.data;
    } else if (this.selectedStatus === 'Ready') { 
      dataSource = this.readyDataSource.data;
    } else if (this.selectedStatus === 'Completed') { 
      dataSource = this.completedDataSource.data;
    } else {
      dataSource = this.summaryDataSource.data;
    }
      
    this.isAllSelected() ?
      this.selection.clear() :
      dataSource.forEach(row => this.selection.select(row));
  }

  // Method to generate PDF for a single row
  generateSinglePdf(row: any): void {
    if (!this.companyProfile) {
      this.snackBar.open("Company profile is not loaded.", 'Close', { duration: 3000 });
      return;
    }
    
    this.isPdfLoading = true;

    if (this.selectedStatus === 'Pending') {
      // It's a PendingReportProductDto
      const doc = new jsPDF(); 
      this.createPendingPdf(doc, [row], row.serviceCenterName, row.serviceCenterAddress);
      doc.save(`SC_Pending_${row.iwNo}.pdf`);
      this.isPdfLoading = false;
    } else if (this.selectedStatus === 'In Progress') {
      // It's an InProgressReportProductDto
      const doc = new jsPDF();
      this.createInProgressPdf(doc, [row], row.serviceCenterName, row.serviceCenterAddress);
      doc.save(`service-center-in-progress-${row.iwNo}.pdf`);
      this.isPdfLoading = false;
    } else if (this.selectedStatus === 'Ready') { // <-- ADD THIS
      // It's a ReadyReportProductDto
      const doc = new jsPDF();
      this.createReadyPdf(doc, [row], row.serviceCenterName, row.serviceCenterAddress);
      doc.save(`service-center-ready-${row.iwNo}.pdf`);
      this.isPdfLoading = false;
    } else if (this.selectedStatus === 'Completed') { // <-- ADD THIS
      const doc = new jsPDF();
      this.createCompletedPdf(doc, [row], row.serviceCenterName, row.serviceCenterAddress);
      doc.save(`service-center-completed-${row.iwNo}.pdf`);
      this.isPdfLoading = false;
    } else {
      // It's a ServiceCenterReportDto (summary)
      this.generateSummaryPdf(row);
    }
  }

  // --- NEW PDF function for the "Pending" tab ---
  createPendingPdf(
    doc: jsPDF, 
    products: PendingReportProductDto[], 
    serviceCenterName: string, 
    serviceCenterAddress: string | undefined
  ): void {
    // ✅ FIXED: Removed 'a5' to match bulk (Standard A4)
    // If passed doc is null (when called directly), create new. 
    // But typically this method receives a doc. If you call it with new jsPDF(), ensure it's A4.
    // Since this method signature accepts 'doc', ensure the caller passes new jsPDF().
    // If you control the caller (generateSinglePdf), change: const doc = new jsPDF(); 
    
    const pageWidth = doc.internal.pageSize.width;
    const margin = 8; // ✅ Narrow Margin
    const rightX = pageWidth - margin;

    let currentY = this.setupPdfHeader(doc, this.companyProfile!, margin);

    // --- Info Block ---
    let leftY = currentY;
    let rightY = currentY;
    const leftColumnWidth = 110; 

    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("To Service Center:", margin, leftY);
    leftY += 4;

    doc.setFontSize(10).setFont("helvetica", "bold");
    const nameLines = doc.splitTextToSize(serviceCenterName.toUpperCase(), leftColumnWidth);
    doc.text(nameLines, margin, leftY);
    leftY += (nameLines.length * 5);

    if (serviceCenterAddress) {
        doc.setFontSize(8).setFont("helvetica", "normal");
        const addrLines = doc.splitTextToSize(serviceCenterAddress, leftColumnWidth); 
        doc.text(addrLines, margin, leftY);
        leftY += (addrLines.length * 3.5); 
    }

    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("Report Status:", rightX, rightY, { align: 'right' });
    rightY += 4;

    doc.setFontSize(10).setFont("helvetica", "bold");
    doc.setTextColor(0); // Black Status
    doc.text("PENDING", rightX, rightY, { align: 'right' });
    rightY += 5;
    
    doc.setFontSize(9).setFont("helvetica", "normal");
    const dateStr = this.datePipe.transform(new Date(), 'dd MMM yyyy') || '';
    doc.text(`Date: ${dateStr}`, rightX, rightY, { align: 'right' });
    rightY += 5;

    currentY = Math.max(leftY, rightY) + 6;

    // --- Table ---
    const tableHead = [['#', 'I/W No', 'Invoice Info', 'Product Info', 'Warranty']];
    
    const tableBody = products.map((item, i) => {
        const iw = item.iwNo || '-';
        // ✅ FIXED: Use createdDate
        const invDate = item.createdDate ? this.datePipe.transform(item.createdDate, 'dd-MM-yy') : null;
        const invNo = item.inNo || null;
        let invoiceDetails = '-';
        if (invDate || invNo) invoiceDetails = [invDate ? `Dt: ${invDate}` : '', invNo].filter(Boolean).join('\n');

        const prod = `${item.productName}\nS/N: ${item.serialNo || '-'}`;

        let war = '-';
        if (item.warrantyStatus === 'In Warranty') {
             const end = item.warrantyEndDate ? this.datePipe.transform(item.warrantyEndDate, 'dd-MM-yy') : '-';
             war = `In Warranty\nExp: ${end}`;
        } else {
             war = item.warrantyStatus || 'Out of Warranty';
        }

        return [(i + 1).toString(), iw, invoiceDetails, prod, war];
    });

    autoTable(doc, {
      startY: currentY,
      head: tableHead,
      body: tableBody,
      theme: 'plain',
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2, valign: 'top', textColor: 0, overflow: 'linebreak' },
      headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', lineWidth: { bottom: 0.1 }, lineColor: [180, 180, 180] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 28 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
            const text = data.cell.raw as string;
            if (text && text.toLowerCase().includes('out of warranty')) {
                data.cell.styles.textColor = [220, 53, 69];
                data.cell.styles.fontStyle = 'bold';
            }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    this.addReportSummary(doc, finalY, products.length, margin);
    this.addGlobalPageFooters(doc, margin);
  }

  // --- RENAMED existing PDF function for summary tabs ---
  // --- RENAMED existing PDF function for summary tabs ---
  generateSummaryPdf(row: ServiceCenterReportDto & { serviceCenterAddress?: string }): void {
    this.isPdfLoading = true;
    const startDate = this.range.value.start;
    const endDate = this.range.value.end;

    const request: ReportPaginationRequestDto = {
      pageIndex: 0,
      pageSize: 1000,
      filter: '',
      sortColumn: 'CreatedDate',
      sortDirection: 'desc',
      startDate: startDate ? startDate.toISOString() : undefined,
      endDate: endDate ? endDate.toISOString() : undefined
    };

    this.reportService.getServiceCenterProductDetails(row.serviceCenterId, row.productStatusId, request)
      .pipe(finalize(() => this.isPdfLoading = false))
      .subscribe({
        next: (response: ApiResponse<ServiceCenterProductDetailsDto[]>) => {
          if (response.success && response.data && response.data.length > 0) {
            const doc = new jsPDF();
            
            // ✅ FIX: Get address from the fetched details (preferable) or fallback to row
            const address = response.data[0].serviceCenterAddress || row.serviceCenterAddress;

            this._createSummaryProductsPdf(
              doc, 
              response.data, 
              row.serviceCenterName, 
              address, // <-- Now passing the correct address
              row.status, 
              row.totalCount, 
              this.companyProfile!
            );

            doc.save(`service-center-products-${row.serviceCenterName}-${row.status}.pdf`);
          } else {
            // Handle case where no data is returned or list is empty
            if (response.success && (!response.data || response.data.length === 0)) {
               this.snackBar.open("No records found to generate PDF.", 'Close', { duration: 3000 });
            } else {
               this.snackBar.open("Error: Failed to fetch product details for PDF.", 'Close', { duration: 5000 });
            }
          }
        },
        error: () => {
          this.snackBar.open("Failed to load details for PDF. Please try again.", 'Close', { duration: 5000 });
        }
      });
  }
  
  // Generate PDF for bulk selection
  generatePdf(): void {
    if (!this.companyProfile) {
      this.snackBar.open("Company profile is not loaded.", 'Close', { duration: 3000 });
      return;
    }
    if (this.selection.isEmpty()) {
      this.snackBar.open('Please select at least one row.', 'Close', { duration: 3000 });
      return;
    }

    const selectedData = this.selection.selected;

    // Route to the correct bulk generator based on the active tab
    if (this.selectedStatus === 'Pending') {
      this.generateBulkPendingPdf(selectedData);
    } 
    else if (this.selectedStatus === 'In Progress') {
      this.generateBulkInProgressPdf(selectedData);
    } 
    else if (this.selectedStatus === 'Ready') {
      this.generateBulkReadyPdf(selectedData);
    } 
    else if (this.selectedStatus === 'Completed') {
      this.generateBulkCompletedPdf(selectedData);
    } 
    else {
       // --- "ALL" TAB LOGIC (Unified Service Center grouping) ---
       this.isPdfLoading = true;
       const startDate = this.range.value.start;
       const endDate = this.range.value.end;

       // 1. API Calls
       const apiCalls = this.selection.selected.map((row: ServiceCenterReportDto) => {
         const request: ReportPaginationRequestDto = {
           pageIndex: 0,
           pageSize: 1000,
           filter: '',
           sortColumn: 'CreatedDate',
           sortDirection: 'desc',
           startDate: startDate ? startDate.toISOString() : undefined,
           endDate: endDate ? endDate.toISOString() : undefined,
         };
         return this.reportService.getServiceCenterProductDetails(row.serviceCenterId, row.productStatusId, request);
       });

       forkJoin(apiCalls)
         .pipe(finalize(() => this.isPdfLoading = false))
         .subscribe({
           next: (responses) => {
             // Map to store grouped data: Key = ServiceCenterId, Value = Group Object
             const groupedMap = new Map<number, any>();

             responses.forEach((response, index) => {
               if (response.success && response.data && response.data.length > 0) {
                 const row = this.selection.selected[index] as ServiceCenterReportDto;
                 
                 // Initialize group if not exists
                 if (!groupedMap.has(row.serviceCenterId)) {
                    // Get address from first item or row
                    const address = response.data[0].serviceCenterAddress;
                    groupedMap.set(row.serviceCenterId, {
                        name: row.serviceCenterName,
                        address: address,
                        // We use 'SUMMARY' as the overall block label since it contains mixed statuses
                        statusLabel: 'SUMMARY', 
                        products: [] 
                    });
                 }

                 // Inject the specific status (e.g. 'Pending', 'Completed') into the product items
                 // so we can display it in the table row later
                 const productsWithStatus = response.data.map(item => ({
                    ...item,
                    _rowStatus: row.status // <--- attach status here
                 }));

                 // Merge products into the existing service center group
                 groupedMap.get(row.serviceCenterId).products.push(...productsWithStatus);
               }
             });

             const preparedData = Array.from(groupedMap.values());

             if (preparedData.length > 0) {
               this.generateBulkSummaryPdf(preparedData);
             } else {
               this.snackBar.open('No product details found for the selected rows.', 'Close', { duration: 5000 });
             }
           },
           error: () => {
             this.snackBar.open('Failed to load data for PDF. Please try again.', 'Close', { duration: 5000 });
           }
         });
    }
  }

  // --- HELPER 1: Group Data by Service Center ---
  private groupDataByServiceCenter(data: any[]): any[] {
    const map = new Map();
    data.forEach(item => {
      if (!map.has(item.serviceCenterId)) {
        map.set(item.serviceCenterId, {
          id: item.serviceCenterId,
          name: item.serviceCenterName,
          address: item.serviceCenterAddress,
          products: []
        });
      }
      map.get(item.serviceCenterId).products.push(item);
    });
    return Array.from(map.values());
  }

  // --- HELPER 2: Draw "To Service Center" Block at specific Y ---
  // Returns the new Y position after drawing the block
  private drawServiceCenterBlock(doc: jsPDF, y: number, scName: string, scAddress: string | undefined, statusLabel: string, margin: number = 14): number {
    const pageWidth = doc.internal.pageSize.width;
    const rightX = pageWidth - margin; 
    
    let leftY = y;
    let rightY = y;
    const leftColumnWidth = 110; 

    // Left Side
    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("To Service Center:", margin, leftY);
    leftY += 4;

    doc.setFontSize(10).setFont("helvetica", "bold");
    const nameLines = doc.splitTextToSize(scName.toUpperCase(), leftColumnWidth);
    doc.text(nameLines, margin, leftY);
    leftY += (nameLines.length * 5);

    if (scAddress) {
      doc.setFontSize(8).setFont("helvetica", "normal");
      const addrLines = doc.splitTextToSize(scAddress, leftColumnWidth);
      doc.text(addrLines, margin, leftY);
      leftY += (addrLines.length * 3.5);
    }

    // Right Side
    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("Report Status:", rightX, rightY, { align: 'right' });
    rightY += 4;

    doc.setFontSize(10).setFont("helvetica", "bold");
    
    // ✅ FIXED: Always Black Color for Status
    doc.setTextColor(0, 0, 0); 
    
    doc.text(statusLabel, rightX, rightY, { align: 'right' });
    doc.setTextColor(0);
    rightY += 5;

    doc.setFontSize(9).setFont("helvetica", "normal");
    const dateStr = this.datePipe.transform(new Date(), 'dd MMM yyyy') || '';
    doc.text(`Date: ${dateStr}`, rightX, rightY, { align: 'right' });
    rightY += 5;

    return Math.max(leftY, rightY) + 4;
  }

  private generateBulkPendingPdf(data: PendingReportProductDto[]): void {
    const doc = new jsPDF();
    const groups = this.groupDataByServiceCenter(data);
    const pageHeight = doc.internal.pageSize.height;
    
    // ✅ Narrow Margin
    const margin = 8;

    let currentY = this.setupPdfHeader(doc, this.companyProfile!, margin);

    groups.forEach((group, index) => {
      if (currentY + 55 > pageHeight) {
        doc.addPage();
        currentY = 15;
      }

      currentY = this.drawServiceCenterBlock(doc, currentY, group.name, group.address, 'PENDING', margin);

      const tableHead = [['#', 'I/W No', 'Invoice Info', 'Product Info', 'Warranty']];
      const tableBody = group.products.map((item: any, i: number) => {
          const iw = item.iwNo || '-';
          
          // ✅ FIXED: Use 'createdDate' instead of 'inDate'
          const invDate = item.createdDate ? this.datePipe.transform(item.createdDate, 'dd-MM-yy') : null;
          const invNo = item.inNo || null;
          
          let invoiceDetails = '-';
          if (invDate || invNo) {
            // Combine Date and No.
            invoiceDetails = [invDate ? `Dt: ${invDate}` : '', invNo].filter(Boolean).join('\n');
          }
          
          const prod = `${item.productName}\nS/N: ${item.serialNo || '-'}`;
          
          // Warranty Logic
          let war = '-';
          if (item.warrantyStatus === 'In Warranty') {
             const end = item.warrantyEndDate ? this.datePipe.transform(item.warrantyEndDate, 'dd-MM-yy') : '-';
             war = `In Warranty\nExp: ${end}`;
          } else {
             war = item.warrantyStatus || 'Out of Warranty';
          }
            
          return [(i + 1).toString(), iw, invoiceDetails, prod, war];
      });

      autoTable(doc, {
        startY: currentY,
        head: tableHead,
        body: tableBody,
        theme: 'plain',
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2, valign: 'top', overflow: 'linebreak', textColor: 0 },
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', lineWidth: { bottom: 0.1 }, lineColor: [180, 180, 180] },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 35 }
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) { 
                const text = data.cell.raw as string;
                if (text && text.toLowerCase().includes('out of warranty')) {
                    data.cell.styles.textColor = [220, 53, 69]; // Red
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
    });

    this.addReportSummary(doc, currentY, data.length, margin);
    this.addGlobalPageFooters(doc, margin);
    doc.save('Bulk_Pending_Report.pdf');
  }

  private generateBulkInProgressPdf(data: InProgressReportProductDto[]): void {
    const doc = new jsPDF();
    const groups = this.groupDataByServiceCenter(data);
    const pageHeight = doc.internal.pageSize.height;
    const margin = 8;

    let currentY = this.setupPdfHeader(doc, this.companyProfile!, margin);

    groups.forEach((group) => {
      if (currentY + 60 > pageHeight) {
        doc.addPage();
        currentY = 15; 
      }

      currentY = this.drawServiceCenterBlock(doc, currentY, group.name, group.address, 'IN PROGRESS', margin);

      // ✅ ADDED: 'Invoice No' column
      const tableHead = [['#', 'I/W No', 'Invoice info', 'Product Info', 'Service Ref']];
      
      const tableBody = group.products.map((item: any, i: number) => {
        const iw = item.iwNo || '-';
        
        // ✅ NEW: Invoice Details Logic (Same as Pending)
        const invDate = item.createdDate ? this.datePipe.transform(item.createdDate, 'dd-MM-yy') : null;
        const invNo = item.inNo || null;
        let invoiceDetails = '-';
        if (invDate || invNo) {
            invoiceDetails = [invDate ? `Dt: ${invDate}` : '', invNo].filter(Boolean).join('\n');
        }

        const prodDetails = `${item.productName || 'Unknown'}\nS/N: ${item.serialNo || '-'}`;
        const serviceRef = item.serviceInvoiceNo || '-';

        return [ (i + 1).toString(), iw, invoiceDetails, prodDetails, serviceRef ];
      });

      autoTable(doc, {
        startY: currentY,
        head: tableHead,
        body: tableBody,
        theme: 'plain',
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2, valign: 'top', overflow: 'linebreak', textColor: 0 },
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', lineWidth: { bottom: 0.1 }, lineColor: [180, 180, 180] },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        // ✅ RE-ADJUSTED COLUMN WIDTHS
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' }, 
          1: { cellWidth: 25, halign: 'left' },   // I/W No
          2: { cellWidth: 25, halign: 'left' },   // Invoice (New)
          3: { cellWidth: 'auto', halign: 'left' }, // Product (Flexible)
          4: { cellWidth: 35, halign: 'left' },   // Service Ref
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    });

    this.addReportSummary(doc, currentY, data.length, margin);
    this.addGlobalPageFooters(doc, margin);
    doc.save('ServiceCenter_InProgress_Report.pdf');
  }

  private generateBulkCompletedPdf(data: CompletedReportProductDto[]): void {
    const doc = new jsPDF();
    const groups = this.groupDataByServiceCenter(data);
    const pageHeight = doc.internal.pageSize.height;
    const margin = 8;

    let currentY = this.setupPdfHeader(doc, this.companyProfile!, margin);

    groups.forEach((group) => {
      if (currentY + 60 > pageHeight) {
        doc.addPage();
        currentY = 15; 
      }
      currentY = this.drawServiceCenterBlock(doc, currentY, group.name, group.address, 'COMPLETED', margin);

      const tableHead = [['#', 'I/W No', 'Product', 'Customer', 'Status', 'Ser. InNo', 'Completed & Notes']];
      
      const tableBody = group.products.map((item: any, i: number) => {
        const iw = item.iwNo || '-';
        const prodDetails = `${item.productName || '-'}\nS/N: ${item.serialNo || '-'}`;
        const customer = `${item.customerName || '-'}\n${item.customerContactNo || ''}`;
        let status = item.productStatusName || '-';
        if (item.productStatusName === 'Replace' && item.newSerialNo) status += `\nNew S/N: ${item.newSerialNo}`;
        const rawComp = item.completedDate || item.updatedDate;
        const combinedNotes = `Date: ${rawComp ? this.datePipe.transform(rawComp, 'dd-MM-yy') : '-'}\nNote: ${item.note || '-'}`;

        return [(i + 1).toString(), iw, prodDetails, customer, status, item.serviceInvoiceNo || '-', combinedNotes];
      });

      autoTable(doc, {
        startY: currentY,
        head: tableHead,
        body: tableBody,
        theme: 'plain',
        margin: { left: margin, right: margin },
        styles: { fontSize: 7, cellPadding: 2, valign: 'top', overflow: 'linebreak' },
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', lineWidth: { bottom: 0.1 }, lineColor: [180, 180, 180] },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' }, // Fixed
          1: { cellWidth: 25 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 30 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20 },
          6: { cellWidth: 40 }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
    });

    this.addReportSummary(doc, currentY, data.length, margin);
    this.addGlobalPageFooters(doc, margin);
    doc.save('ServiceCenter_Completed_Report.pdf');
  }

  private generateBulkSummaryPdf(bulkData: any[]): void {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const margin = 8; 

    let currentY = this.setupPdfHeader(doc, this.companyProfile!, margin);

    bulkData.forEach((group) => {
      if (currentY + 60 > pageHeight) {
        doc.addPage();
        currentY = 15;
      }

      currentY = this.drawServiceCenterBlock(doc, currentY, group.name, group.address, group.statusLabel, margin);

      // ✅ ADDED: 'Invoice' Column
      const tableHead = [['#', 'I/W No & Status', 'Invoice', 'Product Info', 'Customer', 'Details']];
      
      const tableBody = group.products.map((item: any, i: number) => {
         const iw = item.iwNo || '-';
         const prodDetails = `${item.productName || '-'}\nS/N: ${item.serialNo || '-'}`;
         const customer = `${item.customerName || '-'}\n${item.customerContactNo || ''}`;
         const status = (item._rowStatus || item.productStatusName || '-').toUpperCase();

         // ✅ NEW: Invoice Logic (Applied to ALL statuses)
         const invDate = item.createdDate ? this.datePipe.transform(item.createdDate, 'dd-MM-yy') : null;
         const invNo = item.inNo || null;
         let invoiceDetails = '-';
         if (invDate || invNo) {
             invoiceDetails = [invDate ? `Dt: ${invDate}` : '', invNo].filter(Boolean).join('\n');
         }

         // Dynamic Details Logic
         let details = '-';
         const s = status.toLowerCase();

         if (s.includes('pending')) {
             if (item.warrantyStatus === 'In Warranty') {
                 const end = item.warrantyEndDate ? this.datePipe.transform(item.warrantyEndDate, 'dd-MM-yy') : '-';
                 details = `In Warranty\nExp: ${end}`;
             } else {
                 details = item.warrantyStatus || 'Out of Warranty';
             }
         } 
         else if (s.includes('completed')) {
             const rawComp = item.completedDate || item.updatedDate;
             const date = rawComp ? this.datePipe.transform(rawComp, 'dd-MM-yy') : '-';
             details = `Done: ${date}\nNote: ${item.note || '-'}`;
         } 
         else if (s.includes('replace')) {
             details = `New S/N: ${item.newSerialNo || '-'}\nDate: ${this.datePipe.transform(item.updatedDate, 'dd-MM-yy')}`;
         }
         else {
             if(item.serviceInvoiceNo) details = `Ref: ${item.serviceInvoiceNo}`;
         }

         const combinedIwStatus = `${iw}\n${status}`;

         return [ 
             (i + 1).toString(), 
             combinedIwStatus, 
             invoiceDetails, // ✅ New Column
             prodDetails, 
             customer, 
             details 
         ];
      });

      autoTable(doc, {
        startY: currentY,
        head: tableHead,
        body: tableBody,
        theme: 'plain',
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2, valign: 'top', overflow: 'linebreak', textColor: 0 },
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', lineWidth: { bottom: 0.1 }, lineColor: [180, 180, 180] },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        // ✅ RE-ADJUSTED COLUMN WIDTHS
        columnStyles: { 
            0: { cellWidth: 10, halign: 'center' }, 
            1: { cellWidth: 30 },                   // I/W & Status
            2: { cellWidth: 22 },                   // Invoice (New)
            3: { cellWidth: 'auto' },               // Product Info (Flexible)
            4: { cellWidth: 35 },                   // Customer
            5: { cellWidth: 40 }                    // Details
        },
        didParseCell: (data) => {
           // Highlight Out of Warranty in Details (Index 5 now)
           if (data.section === 'body' && data.column.index === 5) {
               const text = data.cell.raw as string;
               if (text && text.toLowerCase().includes('out of warranty')) {
                   data.cell.styles.textColor = [220, 53, 69];
                   data.cell.styles.fontStyle = 'bold';
               }
           }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    });

    const totalItems = bulkData.reduce((acc, curr) => acc + curr.products.length, 0);
    this.addReportSummary(doc, currentY, totalItems, margin);
    this.addGlobalPageFooters(doc, margin);

    doc.save('ServiceCenter_Combined_Summary.pdf');
  }

  private generateBulkReadyPdf(data: ReadyReportProductDto[]): void {
    const doc = new jsPDF();
    const groups = this.groupDataByServiceCenter(data);
    const pageHeight = doc.internal.pageSize.height;
    const margin = 8;

    let currentY = this.setupPdfHeader(doc, this.companyProfile!, margin);

    groups.forEach((group) => {
      if (currentY + 50 > pageHeight) {
        doc.addPage();
        currentY = 15; 
      }

      currentY = this.drawServiceCenterBlock(doc, currentY, group.name, group.address, 'READY', margin);

      // ✅ ADDED: 'Invoice No'
      const tableHead = [['#', 'I/W No', 'Invoice No', 'Product Info', 'Customer', 'Status']];
      
      const tableBody = group.products.map((item: any, i: number) => {
          const iw = item.iwNo || '-';
          
          // ✅ NEW: Invoice Logic
          const invDate = item.createdDate ? this.datePipe.transform(item.createdDate, 'dd-MM-yy') : null;
          const invNo = item.inNo || null;
          let invoiceDetails = '-';
          if (invDate || invNo) {
              invoiceDetails = [invDate ? `Dt: ${invDate}` : '', invNo].filter(Boolean).join('\n');
          }

          const prodDetails = `${item.productName || '-'}\nS/N: ${item.serialNo || '-'}`;
          const customer = `${item.customerName || '-'}\n${item.customerContactNo || ''}`;
          
          let status = item.productStatusName || '-';
          if (item.productStatusName === 'Replace' && item.newSerialNo) {
             status += `\nNew S/N: ${item.newSerialNo}`;
          }
          
          return [ (i + 1).toString(), iw, invoiceDetails, prodDetails, customer, status ];
      });

      autoTable(doc, {
        startY: currentY,
        head: tableHead,
        body: tableBody,
        theme: 'plain',
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2, valign: 'top', overflow: 'linebreak', textColor: 0 },
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', lineWidth: { bottom: 0.1 }, lineColor: [180, 180, 180] },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        // ✅ RE-ADJUSTED COLUMN WIDTHS
        columnStyles: {
           0: { cellWidth: 10, halign: 'center' },
           1: { cellWidth: 20 },
           2: { cellWidth: 22 }, // Invoice
           3: { cellWidth: 'auto' }, // Product
           4: { cellWidth: 30 }, // Customer
           5: { cellWidth: 25 }  // Status
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    });

    this.addReportSummary(doc, currentY, data.length, margin);
    this.addGlobalPageFooters(doc, margin);
    doc.save('Bulk_Ready_Report.pdf');
  }

  // --- NEW: Adds Page Number & Link to EVERY Page ---
  private addGlobalPageFooters(doc: jsPDF, margin: number = 14): void {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8).setFont("helvetica", "normal");
      
      // Divider
      doc.setDrawColor(200); 
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      
      const footerY = pageHeight - 7;

      // Left: Link
      doc.setTextColor(150);
      doc.text("Generated using ", margin, footerY);
      const prefixW = doc.getTextWidth("Generated using ");
      doc.setTextColor(99, 91, 255); 
      doc.textWithLink("https://replezy.com/", margin + prefixW, footerY, { url: 'https://replezy.com/' });

      // Right: Page Number
      doc.setTextColor(150);
      const pageInfo = `Page ${i} of ${pageCount}`;
      doc.text(pageInfo, pageWidth - margin, footerY, { align: 'right' });
    }
  }

  // --- PDF Function for "In Progress" Tab ---
  createInProgressPdf(
    doc: jsPDF, 
    products: InProgressReportProductDto[], 
    serviceCenterName: string, 
    serviceCenterAddress: string | undefined
  ): void {
    const pageWidth = doc.internal.pageSize.width;
    const margin = 8; // ✅ Narrow Margin
    const rightX = pageWidth - margin;

    let currentY = this.setupPdfHeader(doc, this.companyProfile!, margin);

    // --- Info Block ---
    let leftY = currentY;
    let rightY = currentY;
    const leftColumnWidth = 110; 

    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("To Service Center:", margin, leftY);
    leftY += 4;

    doc.setFontSize(10).setFont("helvetica", "bold");
    const nameLines = doc.splitTextToSize(serviceCenterName.toUpperCase(), leftColumnWidth);
    doc.text(nameLines, margin, leftY);
    leftY += (nameLines.length * 5);

    if (serviceCenterAddress) {
        doc.setFontSize(8).setFont("helvetica", "normal");
        const addrLines = doc.splitTextToSize(serviceCenterAddress, leftColumnWidth);
        doc.text(addrLines, margin, leftY);
        leftY += (addrLines.length * 3.5);
    }

    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("Report Status:", rightX, rightY, { align: 'right' });
    rightY += 4;

    doc.setFontSize(10).setFont("helvetica", "bold");
    doc.text("IN PROGRESS", rightX, rightY, { align: 'right' });
    rightY += 5;
    
    doc.setFontSize(9).setFont("helvetica", "normal");
    const dateStr = this.datePipe.transform(new Date(), 'dd MMM yyyy') || '';
    doc.text(`Date: ${dateStr}`, rightX, rightY, { align: 'right' });
    rightY += 5;

    currentY = Math.max(leftY, rightY) + 6;

    // ✅ ADDED: Invoice No
    const tableHead = [['#', 'I/W No', 'Invoice No', 'Product Info', 'Service Ref']];
    
    const tableBody = products.map((item, i) => {
      const iw = item.iwNo || '-';
      
      const invDate = item.createdDate ? this.datePipe.transform(item.createdDate, 'dd-MM-yy') : null;
      const invNo = item.inNo || null;
      let invoiceDetails = '-';
      if (invDate || invNo) invoiceDetails = [invDate ? `Dt: ${invDate}` : '', invNo].filter(Boolean).join('\n');

      const prodDetails = `${item.productName || 'Unknown'}\nS/N: ${item.serialNo || '-'}`;
      const serviceRef = item.serviceInvoiceNo || '-';

      return [(i + 1).toString(), iw, invoiceDetails, prodDetails, serviceRef];
    });

    autoTable(doc, {
      startY: currentY,
      head: tableHead,
      body: tableBody,
      theme: 'plain',
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2, valign: 'top', textColor: 0, overflow: 'linebreak' },
      headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', lineWidth: { bottom: 0.1 }, lineColor: [180, 180, 180] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 }, 
        3: { cellWidth: 'auto' }, 
        4: { cellWidth: 35 } 
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    this.addReportSummary(doc, finalY, products.length, margin);
    this.addGlobalPageFooters(doc, margin);
  }

  createReadyPdf(
    doc: jsPDF, 
    products: ReadyReportProductDto[], 
    serviceCenterName: string, 
    serviceCenterAddress: string | undefined
  ): void {
    const pageWidth = doc.internal.pageSize.width;
    const margin = 8; // ✅ Narrow Margin
    const rightX = pageWidth - margin;

    let currentY = this.setupPdfHeader(doc, this.companyProfile!, margin);

    let leftY = currentY;
    let rightY = currentY;
    const leftColumnWidth = 110; 

    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("To Service Center:", margin, leftY);
    leftY += 4;

    doc.setFontSize(10).setFont("helvetica", "bold");
    const nameLines = doc.splitTextToSize(serviceCenterName.toUpperCase(), leftColumnWidth);
    doc.text(nameLines, margin, leftY);
    leftY += (nameLines.length * 5);

    if (serviceCenterAddress) {
        doc.setFontSize(8).setFont("helvetica", "normal");
        const addrLines = doc.splitTextToSize(serviceCenterAddress, leftColumnWidth);
        doc.text(addrLines, margin, leftY);
        leftY += (addrLines.length * 3.5);
    }

    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("Report Status:", rightX, rightY, { align: 'right' });
    rightY += 4;

    doc.setFontSize(10).setFont("helvetica", "bold");
    doc.setTextColor(13, 110, 253); 
    doc.text("READY", rightX, rightY, { align: 'right' });
    doc.setTextColor(0); 
    rightY += 5;
    
    doc.setFontSize(9).setFont("helvetica", "normal");
    const dateStr = this.datePipe.transform(new Date(), 'dd MMM yyyy') || '';
    doc.text(`Date: ${dateStr}`, rightX, rightY, { align: 'right' });
    rightY += 5;

    currentY = Math.max(leftY, rightY) + 6;

    // ✅ ADDED: Invoice No
    const tableHead = [['#', 'I/W No', 'Invoice No', 'Product Info', 'Customer', 'Status']];
    
    const tableBody = products.map((item, i) => {
      const iw = item.iwNo || '-';
      
      const invDate = item.createdDate ? this.datePipe.transform(item.createdDate, 'dd-MM-yy') : null;
      const invNo = item.inNo || null;
      let invoiceDetails = '-';
      if (invDate || invNo) invoiceDetails = [invDate ? `Dt: ${invDate}` : '', invNo].filter(Boolean).join('\n');

      const prodDetails = `${item.productName || 'Unknown'}\nS/N: ${item.serialNo || '-'}`;
      const customer = `${item.customerName || '-'}\n${item.customerContactNo || ''}`;
      
      let status = item.productStatusName || '-';
      if (item.productStatusName === 'Replace' && item.newSerialNo) {
          status += `\nNew S/N: ${item.newSerialNo}`;
      }

      return [(i + 1).toString(), iw, invoiceDetails, prodDetails, customer, status];
    });

    autoTable(doc, {
      startY: currentY,
      head: tableHead,
      body: tableBody,
      theme: 'plain', 
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2, valign: 'top', textColor: 0, overflow: 'linebreak' },
      headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', lineWidth: { bottom: 0.1 }, lineColor: [180, 180, 180] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 20 },
        2: { cellWidth: 22 }, 
        3: { cellWidth: 'auto' },
        4: { cellWidth: 30 }, 
        5: { cellWidth: 25 } 
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    this.addReportSummary(doc, finalY, products.length, margin);
    this.addGlobalPageFooters(doc, margin);
  }

  createCompletedPdf(
    doc: jsPDF, 
    products: CompletedReportProductDto[], 
    serviceCenterName: string, 
    serviceCenterAddress: string | undefined
  ): void {
    const pageWidth = doc.internal.pageSize.width;
    const margin = 8; // ✅ Narrow Margin
    const rightX = pageWidth - margin;

    let currentY = this.setupPdfHeader(doc, this.companyProfile!, margin);

    // --- Info Block ---
    let leftY = currentY;
    let rightY = currentY;
    const leftColumnWidth = 110; 

    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("To Service Center:", margin, leftY);
    leftY += 4;

    doc.setFontSize(10).setFont("helvetica", "bold");
    const nameLines = doc.splitTextToSize(serviceCenterName.toUpperCase(), leftColumnWidth);
    doc.text(nameLines, margin, leftY);
    leftY += (nameLines.length * 5);

    if (serviceCenterAddress) {
        doc.setFontSize(8).setFont("helvetica", "normal");
        const addrLines = doc.splitTextToSize(serviceCenterAddress, leftColumnWidth);
        doc.text(addrLines, margin, leftY);
        leftY += (addrLines.length * 3.5);
    }

    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("Report Status:", rightX, rightY, { align: 'right' });
    rightY += 4;

    doc.setFontSize(10).setFont("helvetica", "bold");
    doc.setTextColor(25, 135, 84); // Green
    doc.text("COMPLETED", rightX, rightY, { align: 'right' });
    doc.setTextColor(0); 
    rightY += 5;
    
    doc.setFontSize(9).setFont("helvetica", "normal");
    const dateStr = this.datePipe.transform(new Date(), 'dd MMM yyyy') || '';
    doc.text(`Date: ${dateStr}`, rightX, rightY, { align: 'right' });
    rightY += 5;

    currentY = Math.max(leftY, rightY) + 6;

    // ✅ ADDED: Invoice No
    const tableHead = [['#', 'I/W No', 'Invoice', 'Product', 'Customer', 'Status', 'Ser. InNo', 'Notes']];
    
    const tableBody = products.map((item, i) => {
      const iw = item.iwNo || '-';
      
      // ✅ Invoice Logic
      const invDate = item.createdDate ? this.datePipe.transform(item.createdDate, 'dd-MM-yy') : null;
      const invNo = item.inNo || null;
      let invoiceDetails = '-';
      if (invDate || invNo) invoiceDetails = [invDate ? `Dt: ${invDate}` : '', invNo].filter(Boolean).join('\n');

      const prodDetails = `${item.productName || '-'}\nS/N: ${item.serialNo || '-'}`;
      const customer = `${item.customerName || '-'}\n${item.customerContactNo || ''}`;
      
      let status = item.productStatusName || '-';
      if (item.productStatusName === 'Replace' && item.newSerialNo) {
          status += `\nNew S/N: ${item.newSerialNo}`;
      }

      const serInNo = item.serviceInvoiceNo || '-';
      const compDate = item.completedDate ? this.datePipe.transform(item.completedDate, 'dd-MM-yy') : '-';
      const notes = item.note || '-';
      const combinedNotes = `Date: ${compDate}\nNote: ${notes}`;

      return [(i + 1).toString(), iw, invoiceDetails, prodDetails, customer, status, serInNo, combinedNotes];
    });

    autoTable(doc, {
      startY: currentY,
      head: tableHead,
      body: tableBody,
      theme: 'plain',
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 2, valign: 'top', textColor: 0, overflow: 'linebreak' },
      headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', lineWidth: { bottom: 0.1 }, lineColor: [180, 180, 180] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 18 },
        2: { cellWidth: 20 }, 
        3: { cellWidth: 'auto' },
        4: { cellWidth: 20 },
        5: { cellWidth: 15 },
        6: { cellWidth: 15 },
        7: { cellWidth: 35 }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    this.addReportSummary(doc, finalY, products.length, margin);
    this.addGlobalPageFooters(doc, margin);
  }

  /** NEW: Reusable PDF Company Header */
  private addPdfCompanyHeader(doc: jsPDF, companyProfile: CompanyProfileDto): void {
    const margin = 14;
    const mainAddress = [companyProfile.addressLine1, companyProfile.addressLine2].filter(Boolean).join(', ');
    const cityStateZip = [companyProfile.city, companyProfile.state, companyProfile.postalCode].filter(Boolean).join(', ');
    const cityStateZipCountry = [cityStateZip, companyProfile.country].filter(Boolean).join(', ');

    const headerRows: RowInput[] = [
      [{ content: companyProfile.companyName || 'Company Name', styles: { halign: 'center', fontSize: 14, fontStyle: 'bold', cellPadding: { top: 0, bottom: 1 } } }],
      [{ content: mainAddress, styles: { halign: 'center', fontSize: 10, fontStyle: 'normal', cellPadding: 0.5 } }],
      [{ content: cityStateZipCountry, styles: { halign: 'center', fontSize: 10, fontStyle: 'normal', cellPadding: { top: 0, bottom: 1 } } }],
      [{ content: `Phone : ${companyProfile.contactPhone || '-'} | Email : ${companyProfile.contactEmail || '-'}`, styles: { halign: 'center', fontSize: 10, cellPadding: 0.5 } }],
      [{ content: `Web : ${companyProfile.website || '-'}`, styles: { halign: 'center', fontSize: 10, cellPadding: { top: 0.5, bottom: 2 } } }]
    ];

    autoTable(doc, {
      theme: 'plain',
      startY: 12,
      body: headerRows,
      margin: { left: margin, right: margin }
    });
  }

  private _createSummaryProductsPdf(
    doc: jsPDF, 
    products: ServiceCenterProductDetailsDto[], 
    serviceCenterName: string, 
    serviceCenterAddress: string | undefined, 
    status: string, 
    totalCount: number, 
    companyProfile: CompanyProfileDto
  ): void {
    const pageWidth = doc.internal.pageSize.width;
    const margin = 8; // ✅ Narrow Margin
    const rightX = pageWidth - margin;

    let currentY = this.setupPdfHeader(doc, companyProfile, margin);

    // --- Info Block ---
    let leftY = currentY;
    let rightY = currentY;
    const leftColumnWidth = 110; 

    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("To Service Center:", margin, leftY);
    leftY += 4;

    doc.setFontSize(10).setFont("helvetica", "bold");
    const nameLines = doc.splitTextToSize(serviceCenterName.toUpperCase(), leftColumnWidth);
    doc.text(nameLines, margin, leftY);
    leftY += (nameLines.length * 5);

    if (serviceCenterAddress) {
        doc.setFontSize(8).setFont("helvetica", "normal");
        const addrLines = doc.splitTextToSize(serviceCenterAddress, leftColumnWidth);
        doc.text(addrLines, margin, leftY);
        leftY += (addrLines.length * 3.5);
    }

    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("Report Status:", rightX, rightY, { align: 'right' });
    rightY += 4;

    doc.setFontSize(10).setFont("helvetica", "bold");
    doc.setTextColor(this.themeColor[0], this.themeColor[1], this.themeColor[2]);
    doc.text(status.toUpperCase(), rightX, rightY, { align: 'right' });
    doc.setTextColor(0); 
    rightY += 5;
    
    doc.setFontSize(9).setFont("helvetica", "normal");
    const dateStr = this.datePipe.transform(new Date(), 'dd MMM yyyy') || '';
    doc.text(`Date: ${dateStr}`, rightX, rightY, { align: 'right' });
    rightY += 5;

    currentY = Math.max(leftY, rightY) + 6;

    // --- DYNAMIC TABLE SECTION ---
    let tableHead: any[][] = [];
    let tableBody: any[][] = [];
    let customColumnStyles: any = {};
    let fontSize = 8; 

    const s = status.toLowerCase().trim();

    // Helper for Invoice Logic
    const getInvoiceDetails = (item: any) => {
        const invDate = item.createdDate ? this.datePipe.transform(item.createdDate, 'dd-MM-yy') : null;
        const invNo = item.inNo || null;
        if (invDate || invNo) return [invDate ? `Dt: ${invDate}` : '', invNo].filter(Boolean).join('\n');
        return '-';
    };

    if (s === 'pending') {
        tableHead = [['#', 'I/W No', 'Invoice Info', 'Product Info', 'Warranty']];
        tableBody = products.map((item, i) => {
            const iw = item.iwNo || '-';
            const invoiceDetails = getInvoiceDetails(item);
            const prod = `${item.productName}\nS/N: ${item.serialNo || '-'}`;
            
            let war = '-';
            if (item.warrantyStatus === 'In Warranty') {
                 const end = item.warrantyEndDate ? this.datePipe.transform(item.warrantyEndDate, 'dd-MM-yy') : '-';
                 war = `In Warranty\nExp: ${end}`;
            } else {
                 war = item.warrantyStatus || 'Out of Warranty';
            }
            return [(i + 1).toString(), iw, invoiceDetails, prod, war];
        });
        customColumnStyles = { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 25 }, 2: { cellWidth: 25 }, 3: { cellWidth: 'auto' }, 4: { cellWidth: 28 } };

    } else if (s === 'in progress' || s === 'inprogress') {
        // ✅ ADDED Invoice
        tableHead = [['#', 'I/W No', 'Invoice Info', 'Product Info', 'Service Ref']];
        tableBody = products.map((item, i) => {
            const iw = item.iwNo || '-';
            const invoiceDetails = getInvoiceDetails(item);
            const prodDetails = `${item.productName || '-'}\nS/N: ${item.serialNo || '-'}`;
            const serviceRef = item.serviceInvoiceNo || '-';
            return [(i + 1).toString(), iw, invoiceDetails, prodDetails, serviceRef];
        });
        customColumnStyles = { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 25 }, 2: { cellWidth: 25 }, 3: { cellWidth: 'auto' }, 4: { cellWidth: 35 } };

    } else if (s === 'ready') {
        // ✅ ADDED Invoice
        tableHead = [['#', 'I/W No', 'Invoice Info', 'Product Info', 'Customer', 'Status']];
        tableBody = products.map((item, i) => {
             const iw = item.iwNo || '-';
             const invoiceDetails = getInvoiceDetails(item);
             const prodDetails = `${item.productName || '-'}\nS/N: ${item.serialNo || '-'}`;
             const customer = `${item.customerName || '-'}\n${item.customerContactNo || ''}`;
             let stat = item.productStatusName || '-';
             if (item.productStatusName === 'Replace' && item.newSerialNo) stat += `\nNew S/N: ${item.newSerialNo}`;
             return [(i + 1).toString(), iw, invoiceDetails, prodDetails, customer, stat];
        });
        customColumnStyles = { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 20 }, 2: { cellWidth: 22 }, 3: { cellWidth: 'auto' }, 4: { cellWidth: 30 }, 5: { cellWidth: 25 } };

    } else if (s === 'completed') {
        fontSize = 7;
        // ✅ ADDED Invoice
        tableHead = [['#', 'I/W No', 'Invoice Info', 'Product', 'Customer', 'Status', 'Ser. InNo', 'Completed & Notes']];
        tableBody = products.map((item, i) => {
            const iw = item.iwNo || '-';
            const invoiceDetails = getInvoiceDetails(item);
            const prodDetails = `${item.productName || '-'}\nS/N: ${item.serialNo || '-'}`;
            const customer = `${item.customerName || '-'}\n${item.customerContactNo || ''}`;
            let stat = item.productStatusName || '-';
            if (item.productStatusName === 'Replace' && item.newSerialNo) stat += `\nNew S/N: ${item.newSerialNo}`;
            const rawComp = item.completedDate || item.updatedDate;
            const combined = `Date: ${rawComp ? this.datePipe.transform(rawComp, 'dd-MM-yy') : '-'}\nNote: ${item.note || '-'}`;
            return [(i + 1).toString(), iw, invoiceDetails, prodDetails, customer, stat, item.serviceInvoiceNo || '-', combined];
        });
        customColumnStyles = { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 18 }, 2: { cellWidth: 20 }, 3: { cellWidth: 'auto' }, 4: { cellWidth: 20 }, 5: { cellWidth: 15 }, 6: { cellWidth: 15 }, 7: { cellWidth: 35 } };

    } else {
        tableHead = [['#', 'Product Name', 'Serial No', 'Status', 'Created Date']];
        tableBody = products.map((item, i) => [
            (i + 1).toString(), item.productName || '-', item.serialNo || '-', status || 'N/A', this.datePipe.transform(item.createdDate, 'dd-MM-yy') || '-',
        ]);
        customColumnStyles = { 0: { cellWidth: 10 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 35 }, 3: { cellWidth: 25 }, 4: { cellWidth: 25 } };
    }

    autoTable(doc, {
      startY: currentY,
      head: tableHead,
      body: tableBody,
      theme: 'plain',
      margin: { left: margin, right: margin },
      styles: { fontSize: fontSize, cellPadding: 2, valign: 'top', textColor: 0, overflow: 'linebreak' },
      headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', lineWidth: { bottom: 0.1 }, lineColor: [180, 180, 180] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: customColumnStyles,
      didParseCell: (data) => {
        if (s === 'pending' && data.section === 'body' && data.column.index === 4) {
            const text = data.cell.raw as string;
            if (text && text.toLowerCase().includes('out of warranty')) {
                data.cell.styles.textColor = [220, 53, 69];
                data.cell.styles.fontStyle = 'bold';
            }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    this.addReportSummary(doc, finalY, totalCount, margin);
    this.addGlobalPageFooters(doc, margin);
  }

  /** RENAMED: Original _createCombinedPdf */
  private _createCombinedSummaryPdf(
    allPdfData: {
      products: ServiceCenterProductDetailsDto[],
      serviceCenterName: string,
      serviceCenterAddress: string | undefined, // <-- CHANGED: Made optional
      status: string,
      totalCount: number
    }[]
  ): void {
    const doc = new jsPDF();
    allPdfData.forEach((data, index) => {
      if (index > 0) doc.addPage();
      
      this._createSummaryProductsPdf(
        doc, 
        data.products, 
        data.serviceCenterName, 
        data.serviceCenterAddress,
        data.status, 
        data.totalCount, 
        this.companyProfile!
      );
    });
    doc.save(`ServiceCenter_Combined_Report.pdf`);
  }

  getStatusClasses(status: string): string {
    if (!status) return '';
    // Converts "In Progress" -> "in-progress", "Not Accepted" -> "not-accepted", etc.
    return status.toLowerCase().trim().replace(/\s+/g, '-');
  }

  onSwipe(id: number | string, action: 'open' | 'close') {
    if (action === 'open') {
      this.swipedRowId = id;
    } else {
      this.swipedRowId = null;
    }
  }

  private setupPdfHeader(doc: jsPDF, companyProfile: CompanyProfileDto, margin: number = 14): number {
    const pageWidth = doc.internal.pageSize.width;
    const centerX = pageWidth / 2;
    let currentY = 8;

    const centerText = (text: string, y: number, fontSize: number, fontStyle: string = 'normal') => {
      doc.setFont("helvetica", fontStyle).setFontSize(fontSize);
      doc.text(text, centerX, y, { align: 'center' });
    };

    // Company Name
    doc.setTextColor(0);
    centerText(companyProfile.companyName || 'COMPANY NAME', currentY, 13, 'bold');
    currentY += 5;

    // Address
    doc.setFont("helvetica", "normal").setFontSize(8);
    const address = [companyProfile.addressLine1, companyProfile.addressLine2, companyProfile.city, companyProfile.postalCode].filter(Boolean).join(', ');
    const addressLines = doc.splitTextToSize(address, pageWidth - (margin * 2)); 
    doc.text(addressLines, centerX, currentY, { align: 'center' });
    currentY += (addressLines.length * 3.5);

    // Contact
    const contact = [
        companyProfile.contactPhone ? `Ph: ${companyProfile.contactPhone}` : '',
        companyProfile.contactEmail ? `Email: ${companyProfile.contactEmail}` : ''
    ].filter(Boolean).join(' | ');
    doc.text(contact, centerX, currentY, { align: 'center' });
    currentY += 4;
    
    // Divider Line
    doc.setLineWidth(0.3);
    doc.setDrawColor(0);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    
    return currentY + 5;
  }

  private addReportSummary(doc: jsPDF, lastY: number, totalItems: number, margin: number = 14): void {
     const pageHeight = doc.internal.pageSize.height;
     const pageWidth = doc.internal.pageSize.width;
     
     let fy = lastY + 6; 
     
     // Check if we need a new page
     if (fy + 25 > pageHeight - 15) {
        doc.addPage();
        fy = 15;
     }

     doc.setDrawColor(0);
     doc.setLineWidth(0.3);
     doc.line(margin, fy, pageWidth - margin, fy);
     fy += 5;

     // Total Items
     doc.setFont("helvetica", "bold").setFontSize(10);
     doc.setTextColor(0);
     doc.text(`Total Items: ${totalItems}`, margin, fy);

     // Notes
     fy += 6;
     doc.setFont("helvetica", "bold").setFontSize(8);
     doc.text("Notes:", margin, fy);
     doc.setFont("helvetica", "normal");
     doc.text("Subject to service terms & conditions.", margin + 10, fy);
  }
}