import { AfterViewInit, Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, ElementRef, HostListener } from '@angular/core';
import { MatTableDataSource, MatTable } from '@angular/material/table';
import { MatSort, Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { DatePipe } from '@angular/common';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  FieldExecutiveUpdateDto,
  ReplacementProduct,
  ReplacementProductService,
} from 'src/app/services/replacement-product.service';
import { DialogData, ReplacementProductDialogComponent, Replacement, ReplacedItem } from './replacement-product-dialog/replacement-product-dialog.component';
import { ApiResponse, PaginationRequestDto } from 'src/app/common/interfaces/common';

// New imports for PDF generation
import { jsPDF } from 'jspdf';
import autoTable, { RowInput } from "jspdf-autotable";
import { EncryptionService } from 'src/app/services/encryption.service';
import { environment } from 'src/app/environments/environments';
import { MaterialModule } from 'src/app/material.module';
import { DashboardService } from 'src/app/services/dashboard.service';
import { AuthService } from 'src/app/services/auth.service';
import { ReplacementImportDialogComponent } from './replacement-import-dialog/replacement-import-dialog.component';
import * as saveAs from 'file-saver';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CompanyProfileDto, ProfileService } from 'src/app/services/profile.service';
import { FabClickService } from 'src/app/services/fab-click.service';
import { GlobalSearchService } from 'src/app/services/global-search.service';
import { PageTitleService } from 'src/app/services/page-title.service';
import { ExportState, GlobalImportExportService } from 'src/app/services/global-import-export.service';
import { MatMenu, MatMenuModule } from '@angular/material/menu';
import { GlobalFilterService } from 'src/app/services/global-filter.service';
import { SwipeableDirective } from 'src/app/common/directive/swipeable.directive';
import { FieldHandoverDialogComponent } from '../field-executive-dashboard/field-handover-dialog/field-handover-dialog.component';
import { TrashDialogComponent } from './trash-dialog/trash-dialog.component';

@Component({
  selector: 'app-replacement-products',
  templateUrl: './replacement-products.component.html',
  styleUrls: ['./replacement-products.component.scss'],
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
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    RouterLink,
    MaterialModule,
    MatTooltipModule,
    MatMenuModule,
    SwipeableDirective,
    FieldHandoverDialogComponent,
    TrashDialogComponent
  ],
  providers: [DatePipe]
})
export class ReplacementProductsComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = [
    '#',
    'InvertDate',
    'InvertNo',
    'ContactName',
    'ContactNo',
    'GroupStatus',
    'action'
  ];
  //dataSource: MatTableDataSource<ReplacementProduct> = new MatTableDataSource<ReplacementProduct>();
  isLoading: boolean = false;
  isPdfLoading: boolean = false;
  filterValue: string = '';
  totalCount: number;
  pendingCount: number = 0;
  inProgressCount: number = 0;
  completedCount: number = 0;
  selectedStatus: string = '';
  readyCount: number = 0;
  swipedReplacementId: number | string | null = null;
  currentUserId: number = 0;

  public replacementProducts: ReplacementProduct[] = [];
  private currentPage: number = 0;
  private pageSize: number = 15;
  private hasMoreData: boolean = true;
  private filterSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // isExporting: boolean = false;
  // exportProgress: number = 0;
  private progressInterval: any;

  private trashClickSubscription: Subscription;
  private importClickSubscription: Subscription;
  private exportClickSubscription: Subscription;
  private fabClickSubscription: Subscription;
  private searchSubscription: Subscription;

  private companyProfile: CompanyProfileDto | null = null;
  private refreshSubscription: Subscription;
  private scrollSubject = new Subject<Event>();
  private resizeSubject = new Subject<void>();

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatTable) table?: MatTable<any>;
  @ViewChild('tableContainer') private tableContainer: ElementRef;
  @ViewChild('statusMenu') statusMenu: MatMenu;
  constructor(
    private replacementProductService: ReplacementProductService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef,
    private datePipe: DatePipe,
    private encryptionService: EncryptionService,
    private route: ActivatedRoute,
    private router: Router,
    private dashboardService: DashboardService,
    private authService: AuthService,
    private profileService: ProfileService,
    private fabClickService: FabClickService,
    private globalSearchService: GlobalSearchService,
    private pageTitleService: PageTitleService,
    private globalImportExportService: GlobalImportExportService,
    private globalFilterService: GlobalFilterService
  ) {
    this.scrollSubject.pipe(
      debounceTime(100),
      takeUntil(this.destroy$)
    ).subscribe((event) => this.handleScroll(event));

    this.resizeSubject.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.checkAndLoadMore();
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.resizeSubject.next();
  }

  ngOnInit(): void {
    const userId = this.authService.getUserId();
    if (userId) {
      this.currentUserId = userId;
    }

    this.loadStatusCounts(); // <-- Call this method
    this.loadCompanyProfile();
    // Subscribe to query parameters to get the initial filter value
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {

      if (params['groupStatus']) {
        const status = params['groupStatus'];

        // 1. Set the filter value for the API
        this.filterValue = status;

        // 2. Set the visual selected status for the Menu Items (active-filter class)
        this.selectedStatus = status;

        // 3. Tell the Global Service to fill the Header Icon
        if (this.globalFilterService.setFilterActive) {
          this.globalFilterService.setFilterActive(true);
        }

        this.resetAndLoadProducts();
      } else {
        // Optional: Reset if no param (Handle 'Back' navigation)
        // this.selectedStatus = '';
        // this.globalFilterService.setFilterActive(false);
      }
    });

    // 2. Subscribe to click events
    this.fabClickSubscription = this.fabClickService.fabClick$
      .pipe(takeUntil(this.destroy$)) // Good practice to add takeUntil
      .subscribe(() => {
        this.openDialog('Add');
      });

    // 2. Subscribe to search query changes
    this.searchSubscription = this.globalSearchService.searchQuery$
      .pipe(takeUntil(this.destroy$)) // Good practice
      .subscribe(query => {
        this.filterSubject.next(query);
      });

    this.refreshSubscription = this.globalSearchService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Reload the table data
        this.resetAndLoadProducts();
        // Optionally reload status counts too if they might have changed
        this.loadStatusCounts();
      });

    this.trashClickSubscription = this.globalImportExportService.trashClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.openTrash();
      });

    this.importClickSubscription = this.globalImportExportService.importClick$
      .pipe(takeUntil(this.destroy$)) // Good practice
      .subscribe(() => {
        this.openImportDialog();
      });

    // Listen for export click
    this.exportClickSubscription = this.globalImportExportService.exportClick$
      .pipe(takeUntil(this.destroy$)) // Good practice
      .subscribe(() => {
        this.exportData('excel');
      });

    // Subscribe to filter changes and debounce them
    this.filterSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(filterValue => {
      this.filterValue = filterValue;
      this.resetAndLoadProducts();
    });

    // Initial load of products if no query parameter is present on page load
    if (!this.filterValue) {
      this.loadReplacementProducts();
    }
  }

  loadStatusCounts(): void {
    this.dashboardService.getStatusCounts().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.totalCount = response.data.reduce((sum, item) => sum + (item.totalCount || 0), 0);
          this.pendingCount = response.data.find(d => d.groupStatus === 'Pending')?.totalCount || 0;
          this.inProgressCount = response.data.find(d => d.groupStatus === 'In Progress')?.totalCount || 0;
          this.readyCount = response.data.find(d => d.groupStatus === 'Ready')?.totalCount || 0;
          this.completedCount = response.data.find(d => d.groupStatus === 'Completed')?.totalCount || 0;
        }
      },
      error: (err) => {
        console.error('An error occurred while fetching status counts:', err);
      }
    });
  }

  // --- NEW: Fetch details and open dialog automatically ---
  openSpecificReplacement(invertNo: string): void {
    this.isLoading = true; // Show spinner while fetching

    // We reuse the method you already use for PDF generation
    this.replacementProductService.getReplacementProductsByInvertNo(invertNo)
      .pipe(finalize(() => this.isLoading = false), takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Check if we found the record
          if (response.success && response.data && response.data.length > 0) {
            const product = response.data[0]; // Take the first match

            // Open the dialog in 'Update' mode (View Details)
            this.openDialog('Update', product);

            // Optional: Clean up the URL so the dialog doesn't reopen on refresh
            this.clearUrlParams();
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

  // Helper to remove the query param from URL without reloading
  clearUrlParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { openInvertNo: null },
      queryParamsHandling: 'merge'
    });
  }

  btnCategoryClick(status: string): void {
    if (this.selectedStatus === status) {
      this.selectedStatus = '';
      this.filterValue = '';
    } else {
      this.selectedStatus = status;
      this.filterValue = status;
    }

    // --- NEW: Notify Service to update Header Icon ---
    // Assuming your service has a method/subject for this. 
    // If not, add an 'activeFilter$' BehaviorSubject to your GlobalFilterService.
    if (this.globalFilterService.setFilterActive) {
      this.globalFilterService.setFilterActive(this.selectedStatus !== '');
    }

    this.resetAndLoadProducts();
  }

  ngAfterViewInit(): void {
    // 1. Set the sort
    //this.dataSource.sort = this.sort;
    this.globalFilterService.setFilterMenu(this.statusMenu);
    this.changeDetectorRef.detectChanges();

    // 2. Listen to sort change events
    this.sort.sortChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.resetAndLoadProducts();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.globalFilterService.clearFilterMenu();

    // Unsubscribe from all (they are already piped with takeUntil, but good practice)
    if (this.fabClickSubscription) this.fabClickSubscription.unsubscribe();
    if (this.searchSubscription) this.searchSubscription.unsubscribe();
    if (this.trashClickSubscription) this.trashClickSubscription.unsubscribe();
    if (this.importClickSubscription) this.importClickSubscription.unsubscribe();
    if (this.exportClickSubscription) this.exportClickSubscription.unsubscribe();
    if (this.refreshSubscription) this.refreshSubscription.unsubscribe();
  }

  trackById(index: number, item: ReplacementProduct): number {
    return item.id;
  }

  onScroll(event: Event): void {
    this.scrollSubject.next(event);
  }

  private handleScroll(event: Event): void {
    if (this.isLoading || !this.hasMoreData) return;

    const element = event.target as HTMLElement;
    // Increased threshold slightly to load data a bit earlier before hitting bottom
    const threshold = 200;

    if (element.scrollHeight - element.scrollTop - element.clientHeight <= threshold) {
      this.loadReplacementProducts();
    }
  }

  onFilterChange(filterValue: string): void {
    // Update the header input value to match
    this.globalSearchService.updateSearch(filterValue);
    // Trigger the local filter
    this.filterSubject.next(filterValue);
  }

  private resetAndLoadProducts(): void {
    this.replacementProducts = [];
    this.currentPage = 0;
    this.hasMoreData = true;
    //this.dataSource.data = [];
    this.loadReplacementProducts();
  }

  loadReplacementProducts(): void {
    if (this.isLoading || !this.hasMoreData) {
      return;
    }

    this.isLoading = true;

    const request: PaginationRequestDto = {
      pageIndex: this.currentPage,
      pageSize: this.pageSize,
      filter: this.filterValue,
      sortColumn: this.sort?.active || 'InvertDate',
      sortDirection: (this.sort?.direction || 'desc') as 'asc' | 'desc' | null,
    };

    this.replacementProductService.getReplacementProducts(request) // Assuming a new paginated endpoint
      .pipe(finalize(() => this.isLoading = false), takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponse<ReplacementProduct[]>) => {
          if (response.success) {
            const newProducts = response.data || [];

            // Fix timezone for dates returned without 'Z' (Backend sends UTC time)
            newProducts.forEach(p => {
              if (p.invertDate && typeof p.invertDate === 'string' && !p.invertDate.endsWith('Z')) {
                p.invertDate += 'Z';
              }
            });

            this.replacementProducts = [...this.replacementProducts, ...newProducts];
            this.currentPage++;
            this.hasMoreData = newProducts.length === this.pageSize;
            this.checkAndLoadMore();
          } else {
            this.snackBar.open(`Error: ${response.message}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        },
        error: (error) => {
          console.error('Failed to load replacement products:', error);
          this.snackBar.open('Failed to load replacement products. Please try again.', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      });
  }

  private checkAndLoadMore(): void {
    // Use a small timeout to wait for the DOM to update with new rows
    setTimeout(() => {
      // Safety checks
      if (!this.tableContainer || !this.hasMoreData || this.isLoading) {
        return;
      }

      const element = this.tableContainer.nativeElement;
      const isScrollbarVisible = element.scrollHeight > element.clientHeight;

      // If no scrollbar is visible AND we have more data, load the next page.
      // This will repeat until the container is full or we run out of data.
      if (!isScrollbarVisible) {
        this.loadReplacementProducts();
      }
    }, 50); // 50ms delay is usually enough for the DOM to render
  }

  openDialog(action: string, replacementProduct?: ReplacementProduct): void {
    this.swipedReplacementId = null;

    const dialogData: DialogData = {
      action: action,
      replacement: replacementProduct ? {
        id: replacementProduct.id,
        invertNo: replacementProduct.invertNo,
        contact: {
          id: replacementProduct.contactId ?? 0,
          name: replacementProduct.contactName || '',
          contactNo: replacementProduct.contactNo || '',
          isActive: true,
        },
        replacedItems: []
      } : undefined
    };

    const dialogRef = this.dialog.open(ReplacementProductDialogComponent, {
      width: '1300px',
      data: dialogData,
      autoFocus: false
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result && result.event !== 'Cancel') {
        this.snackBar.open(`${result.event} action successful.`, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        // Reload the status counts to update the cards
        this.loadStatusCounts();
        // Reload the table data to reflect changes
        this.resetAndLoadProducts();
      }
    });
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

  generatePdf(replacementProduct: ReplacementProduct): void {
    if (!replacementProduct?.invertNo) {
      this.snackBar.open("Error: Cannot generate PDF. No Invert No found.", 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    if (!this.companyProfile) {
      this.snackBar.open("Company profile is not loaded yet. Please try again in a moment.", 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    this.isPdfLoading = true;
    this.replacementProductService.getReplacementProductsByInvertNo(replacementProduct.invertNo)
      .pipe(finalize(() => this.isPdfLoading = false), takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data && response.data.length > 0) {
            this._createPdf(
              response.data,
              replacementProduct.contactName,
              replacementProduct.contactNo,
              replacementProduct.invertNo ?? null,
              this.companyProfile!
            );
          } else {
            this.snackBar.open("Error: Failed to fetch replacement details for PDF.", 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        },
        error: () => {
          this.snackBar.open("Failed to load details for PDF. Please try again.", 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      });
  }

  private _createPdf(
    data: ReplacementProduct[],
    contactName: string | null,
    contactNumber: string | null,
    invertNo: string | null,
    companyProfile: CompanyProfileDto
  ): void {
    // ✅ 1. Standard A4 Size (removed 'a5' parameter)
    const doc = new jsPDF();

    // ✅ 2. Narrow Margins (8mm)
    const margin = 8;
    const pageWidth = doc.internal.pageSize.width;
    const rightX = pageWidth - margin;

    // 3. Header
    let currentY = this.setupPdfHeader(doc, companyProfile, margin);

    // 4. Receipt Info Block
    let leftY = currentY;
    let rightY = currentY;
    const leftColumnWidth = 110;

    // --- Left: Customer Details ---
    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("Received From:", margin, leftY);
    leftY += 4;

    doc.setFontSize(10).setFont("helvetica", "bold");
    doc.text((contactName || 'Guest').toUpperCase(), margin, leftY);
    leftY += 5;

    doc.setFontSize(9).setFont("helvetica", "normal");
    if (contactNumber) {
      doc.text(`Mo: ${contactNumber}`, margin, leftY);
      leftY += 4;
    }

    // --- Right: Receipt Details ---
    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("Document Type:", rightX, rightY, { align: 'right' });
    rightY += 4;

    doc.setFontSize(10).setFont("helvetica", "bold");
    doc.text("RECEIPT", rightX, rightY, { align: 'right' });
    rightY += 5;

    doc.setFontSize(9).setFont("helvetica", "normal");
    doc.text(`Ref No: ${invertNo || '-'}`, rightX, rightY, { align: 'right' });
    rightY += 5;

    const todayStr = this.datePipe.transform(new Date(), 'dd MMM yyyy') || '';
    doc.text(`Date: ${todayStr}`, rightX, rightY, { align: 'right' });
    rightY += 5;

    // Sync Y position
    currentY = Math.max(leftY, rightY) + 6;

    // Acknowledge Text
    doc.setFontSize(8).setFont("helvetica", "italic");
    doc.setTextColor(100);
    doc.text("Acknowledged receipt of the following products for service/replacement:", margin, currentY);
    doc.setTextColor(0);
    currentY += 4;

    // 5. Table Data Preparation
    const tableHead = [['#', 'Products', 'Invoice Details', 'Warranty Details']];

    const tableBody = data.map((item, i) => {
      // Invoice
      const invDate = item.invoiceDate ? this.datePipe.transform(item.invoiceDate, 'dd-MM-yy') : null;
      const invNo = item.invoiceNo || null;
      let invDetails = '-';
      if (invDate || invNo) {
        invDetails = [invDate ? `Dt: ${invDate}` : '', invNo ? `No: ${invNo}` : ''].filter(Boolean).join('\n');
      }

      // Warranty
      let warDetails = '-';
      if (item.warrantyDuration && item.warrantyUnit) {
        const endDate = this.calculateWarrantyEndDate(new Date(item.invoiceDate), item.warrantyDuration, item.warrantyUnit);
        const endStr = endDate ? this.datePipe.transform(endDate, 'dd-MM-yy') : '';
        warDetails = `${item.warrantyDuration} ${item.warrantyUnit}\nExp: ${endStr}`;
      }

      // Product
      const desc = `${item.productName || 'Unknown'}\nS/N: ${item.oldSerialNo || '-'}`;

      return [
        (i + 1).toString(),
        desc,
        invDetails,
        warDetails
      ];
    });

    // 6. Draw Table
    autoTable(doc, {
      startY: currentY,
      head: tableHead,
      body: tableBody,
      theme: 'plain',
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        valign: 'top',
        overflow: 'linebreak',
        textColor: 0
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: 0,
        fontStyle: 'bold',
        lineWidth: { bottom: 0.1 },
        lineColor: [180, 180, 180]
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' }, // Product takes available space
        2: { cellWidth: 35 },     // Invoice
        3: { cellWidth: 35 }      // Warranty
      }
    });

    // 7. Footer & Signature
    const finalY = (doc as any).lastAutoTable.finalY;
    this.addReceiptSummary(doc, finalY, data.length, invertNo || '', margin);
    this.addGlobalPageFooters(doc, margin);

    doc.save(`Receipt_${invertNo}.pdf`);
  }

  // --- Helper 1: Standard Company Header ---
  private setupPdfHeader(doc: jsPDF, companyProfile: CompanyProfileDto, margin: number = 8): number {
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

    // Divider
    doc.setLineWidth(0.3);
    doc.setDrawColor(0);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    return currentY + 5;
  }

  // --- Helper 2: Receipt Summary & Signature ---
  private addReceiptSummary(doc: jsPDF, lastY: number, totalItems: number, invertNo: string, margin: number): void {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    // Required space for totals + notes + signature (~40mm)
    if (lastY + 40 > pageHeight - 15) {
      doc.addPage();
      lastY = 15;
    }

    let fy = lastY + 6;

    // Divider
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(margin, fy, pageWidth - margin, fy);
    fy += 5;

    // Totals
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Total Items: ${totalItems}`, margin, fy);

    // Notes
    fy += 6;
    doc.setFont("helvetica", "bold").setFontSize(8);
    doc.text("Notes:", margin, fy);
    doc.setFont("helvetica", "normal");
    doc.text("Subject to service terms & conditions.", margin + 10, fy);

    // Signature
    const sigY = fy + 15;
    const rightX = pageWidth - margin;

    doc.setFont("helvetica", "bold").setFontSize(9);
    doc.text("Authorised Signature", rightX, sigY, { align: 'right' });

    doc.setLineWidth(0.1);
    doc.line(rightX - 35, sigY - 5, rightX, sigY - 5);
  }

  // --- Helper 3: Global Footer (Branding & Page No) ---
  private addGlobalPageFooters(doc: jsPDF, margin: number): void {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8).setFont("helvetica", "normal");

      doc.setDrawColor(200);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      const footerY = pageHeight - 7;

      // Left
      doc.setTextColor(150);
      doc.text("Generated using ", margin, footerY);
      const prefixW = doc.getTextWidth("Generated using ");
      doc.setTextColor(99, 91, 255);
      doc.textWithLink("https://replezy.com/", margin + prefixW, footerY, { url: 'https://replezy.com/' });

      // Right
      doc.setTextColor(150);
      const pageInfo = `Page ${i} of ${pageCount}`;
      doc.text(pageInfo, pageWidth - margin, footerY, { align: 'right' });
    }
  }

  private formatWarranty(duration?: number, unit?: string): string {
    if (typeof duration === 'number' && duration > 0 && unit) {
      return `${duration} ${unit}`;
    }
    return '';
  }

  private calculateWarrantyEndDate(invoiceDate: Date, duration?: number, unit?: string): Date | null {
    if (!invoiceDate || !duration || !unit) {
      return null;
    }
    const endDate = new Date(invoiceDate);
    switch (unit) {
      case 'Days':
        endDate.setDate(endDate.getDate() + duration);
        break;
      case 'Months':
        endDate.setMonth(endDate.getMonth() + duration);
        break;
      case 'Years':
        endDate.setFullYear(endDate.getFullYear() + duration);
        break;
    }
    return endDate;
  }

  // This method is no longer used for the paginated approach.
  // private mapReplacementProductToReplacement(rp: ReplacementProduct): Replacement {
  //   return {
  //     id: rp.id,
  //     contact: {
  //       id: rp.contactId ?? 0,
  //       name: rp.contactName || '',
  //       contactNo: rp.contactNo || '',
  //       emailId: (rp as any).contactEmailId || '',
  //       isActive: true
  //     },
  //     replacedItems: [
  //       {
  //         product: {
  //           id: rp.invoiceProductId,
  //           name: rp.productName || '',
  //           isActive: true
  //         },
  //         serialNo: rp.oldSerialNo || '',
  //         invoiceNo: rp.invoiceNo || '',
  //         invoiceDate: rp.invoiceDate,
  //         warrantyDuration: rp.warrantyDuration ?? 0,
  //         warrantyUnit: rp.warrantyUnit || '',
  //         serviceCenter: {
  //           id: rp.serviceCenterId ?? 0,
  //           name: (rp as any).serviceCenterName || '',
  //           address: (rp as any).serviceCenterAddress || '',
  //           isActive: true
  //         },
  //         status: {
  //           id: rp.statusId ?? 0,
  //           statusName: rp.statusName || '',
  //           isActive: true
  //         },
  //         isManualEntry: false,
  //         newSerialNo: rp.newSerialNo || '',
  //         manualWarrantyDuration: undefined,
  //         manualWarrantyUnit: undefined,
  //       }
  //     ],
  //     status: {
  //       id: rp.statusId ?? 0,
  //       statusName: rp.statusName || '',
  //       isActive: true
  //     }
  //   };
  // }

  // This handleDialogAction is no longer needed since the main openDialog handles the result
  handleDialogAction(action: string, data: Replacement | ReplacementProduct): void {
    if (action === 'Delete') {
      const dialogRef = this.dialog.open(ReplacementProductDialogComponent, {
        data: {
          action: 'Delete',
          local_data: (data as ReplacementProduct).invertNo,
        } as DialogData,
      });

      dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
        if (result && result.event === 'Delete') {
          this.snackBar.open('Replacement deleted successfully!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          // Reload the status counts after a successful delete
          this.loadStatusCounts();
          // Reload the table data
          this.resetAndLoadProducts();
        } else if (result && result.event === 'Error') {
          this.snackBar.open(`Error: ${result.data}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      });
    } else {
      this.isLoading = false;
    }
  }

  getStatusClasses(status: string): string {
    if (!status) return '';

    // Converts "In Progress" to "in-progress", "Ready" to "ready", etc.
    return status.toLowerCase().trim().replace(/\s+/g, '-');
  }

  // This method now encrypts the InvertNo before opening the link
  // Corrected generateCustomerLink function
  generateCustomerLink(element: ReplacementProduct): void {
    if (!element.invertNo) {
      this.snackBar.open("Error: Cannot generate link. Missing Invoice Number.", 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    // ⬅️ Get the stored tenantId
    const tenantId = this.authService.getTenantId();
    if (!tenantId) {
      this.snackBar.open("Error: Tenant ID is missing. Please log in again.", 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    const encryptedTenantId = this.encryptionService.encrypt(tenantId.toString());
    const encryptedInvertNo = this.encryptionService.encrypt(element.invertNo);

    // ⬅️ Updated URL to include the tenantId
    const uniqueLink = `${environment.clientUrl}/public/${encryptedTenantId}/invertNo/${encodeURIComponent(encryptedInvertNo)}`;

    // Use the Clipboard API to copy the text
    if (navigator.clipboard) {
      navigator.clipboard.writeText(uniqueLink).then(() => {
        this.snackBar.open('Link copied to clipboard! 📋', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
      }).catch(err => {
        console.error('Failed to copy link:', err);
        this.snackBar.open('Failed to copy link. Please try again.', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      });
    } else {
      // Fallback for browsers that don't support the Clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = uniqueLink;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.snackBar.open('Link copied to clipboard! 📋', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
      } catch (err) {
        console.error('Fallback: Failed to copy link:', err);
        this.snackBar.open('Failed to copy link. Please try again.', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
      document.body.removeChild(textArea);
    }
  }

  private startSimulatedProgress(): void {
    // --- MODIFIED: Report progress to the service ---
    let progress = 0;
    this.globalImportExportService.setExportState(true, progress);

    if (this.progressInterval) clearInterval(this.progressInterval);

    this.progressInterval = setInterval(() => {
      progress += 5;
      if (progress >= 95) {
        clearInterval(this.progressInterval);
      }
      this.globalImportExportService.setExportState(true, progress);
    }, 100);
  }

  exportData(format: 'excel'): void {
    const currentState = this.globalImportExportService.currentState;

    if (currentState.isExporting) return;
    this.startSimulatedProgress();

    const request: PaginationRequestDto = {
      pageIndex: 0, pageSize: 0, filter: this.filterValue,
      sortColumn: this.sort?.active,
      sortDirection: (this.sort?.direction || null) as 'asc' | 'desc' | null,
    };

    this.replacementProductService.exportReplacements(request)
      .subscribe({
        next: (data: Blob) => {
          clearInterval(this.progressInterval);
          this.globalImportExportService.setExportState(true, 100);
          saveAs(data, `Replacements_${new Date().toISOString().slice(0, 10)}.xlsx`);
          this.snackBar.open('Export successful!', 'Close', { duration: 3000 });
          setTimeout(() => {
            this.globalImportExportService.setExportState(false, 0);
          }, 1000);
        },
        error: (error) => {
          clearInterval(this.progressInterval);
          this.globalImportExportService.setExportState(false, 0);
          this.snackBar.open('Export failed. Please try again.', 'Close', { duration: 5000 });
        }
      });
  }

  openImportDialog(): void {
    const dialogRef = this.dialog.open(ReplacementImportDialogComponent, {
      width: '500px',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.resetAndLoadProducts();
        this.loadStatusCounts(); // Also reload status counts
      }
    });
  }

  onSwipe(id: number | string, action: 'open' | 'close') {
    if (action === 'open') {
      this.swipedReplacementId = id;
    } else {
      this.swipedReplacementId = null;
    }
  }

  onFePickup(element: ReplacementProduct): void {
    if (confirm(`Confirm pickup for Invert No: ${element.invertNo}?`)) {
      this.executeFeUpdate({
        id: element.id!,
        invertNo: element.invertNo!,
        actionType: 1, // Pickup
        userId: this.currentUserId
      });
    }
  }

  // 2. HANDOVER: Opens dialog to enter Service Center Invoice details
  onFeHandover(element: ReplacementProduct): void {
    const dialogRef = this.dialog.open(FieldHandoverDialogComponent, {
      width: '400px',
      data: { invertNo: element.invertNo },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Construct the DTO based on dialog result
        const dto: FieldExecutiveUpdateDto = {
          id: element.id!,
          invertNo: element.invertNo!,
          actionType: 2, // Handover
          userId: this.currentUserId,
          // If status is 6 (Not Accepted), we map it to backend logic (which might treat it as Ready/Return)
          // Or pass it explicitly if backend expects it. Based on our SQL, we pass statusId.
          statusId: result.statusId,
          serviceInvoiceNo: result.serviceInvoiceNo,
          tentativeDate: result.tentativeDate ? this.formatDateForApi(result.tentativeDate) : undefined
        };
        this.executeFeUpdate(dto);
      }
    });
  }

  // 3. MARK READY: Completes the cycle
  onFeMarkReady(element: ReplacementProduct): void {
    if (confirm(`Is ${element.invertNo} collected and back at the office?`)) {
      this.executeFeUpdate({
        id: element.id!,
        invertNo: element.invertNo!,
        actionType: 3, // Collect / Ready
        userId: this.currentUserId
      });
    }
  }

  // Shared method to call API
  private executeFeUpdate(dto: FieldExecutiveUpdateDto): void {
    this.isLoading = true;
    this.replacementProductService.updateFieldExecutiveStatus(dto)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.snackBar.open(res.message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
            this.resetAndLoadProducts(); // Refresh Grid
            this.loadStatusCounts(); // Refresh Cards
          } else {
            this.snackBar.open(res.message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Operation failed. Please try again.', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      });
  }

  private formatDateForApi(date: Date): string {
    return date.toISOString();
  }

  openTrash(): void {
    const dialogRef = this.dialog.open(TrashDialogComponent, {
      width: '900px',
      autoFocus: false,
      disableClose: true
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(shouldRefresh => {
      if (shouldRefresh === true) {
        this.resetAndLoadProducts();
        this.loadStatusCounts();
      }
    });
  }
}
