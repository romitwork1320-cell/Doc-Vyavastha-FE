import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

import { BillingService } from '../../../../services/billing.service';
import { FabClickService } from '../../../../services/fab-click.service';
import { GlobalSearchService } from '../../../../services/global-search.service';
import { ConfirmationDialogComponent } from '../../../../common/component/confirmation-dialog/confirmation-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwipeableDirective } from 'src/app/common/directive/swipeable.directive';

import { SalesInvoiceDialogComponent } from './sales-invoice-dialog/sales-invoice-dialog.component';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { finalize } from 'rxjs/operators';
import { ProfileService, CompanyProfileDto } from 'src/app/services/profile.service';

@Component({
  selector: 'app-sales-invoice-list',
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
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    SwipeableDirective
  ],
  providers: [DatePipe],
  templateUrl: './sales-invoice-list.component.html',
  styleUrls: ['./sales-invoice-list.component.scss']
})
export class SalesInvoiceListComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['id', 'documentNo', 'date', 'contact', 'amount', 'actions'];
  dataSource: MatTableDataSource<any> = new MatTableDataSource<any>();

  isLoading: boolean = false;
  filterValue: string = '';
  public documents: any[] = [];

  private currentPage: number = 0;
  private pageSize: number = 20;
  private hasMoreData: boolean = true;
  private readonly documentType = 'SalesInvoice';

  private destroy$ = new Subject<void>();
  private fabClickSubscription!: Subscription;

  @ViewChild(MatSort) sort!: MatSort;

  // ✅ ADDED: State for Mobile Swipe Drawer
  swipedInvoiceId: number | null = null;
  
  // PDF State
  isPdfLoading: boolean = false;
  selectedInvoiceId: number | null = null;
  companyProfile: CompanyProfileDto | null = null;

  constructor(
    private billingService: BillingService,
    private dialog: MatDialog,
    private fabClickService: FabClickService,
    private snackBar: MatSnackBar,
    private globalSearchService: GlobalSearchService,
    private profileService: ProfileService,
    private datePipe: DatePipe
  ) {
  }

  ngOnInit(): void {
    this.loadCompanyProfile();

    this.fabClickSubscription = this.fabClickService.fabClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.openDialog();
      });

    this.globalSearchService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.resetAndLoad();
      });

    this.globalSearchService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe(query => {
        this.filterValue = query;
        this.resetAndLoad();
      });

    this.loadDocuments();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    if (this.sort) {
      this.sort.sortChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.resetAndLoad();
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.fabClickSubscription) {
      this.fabClickSubscription.unsubscribe();
    }
  }

  resetAndLoad() {
    this.currentPage = 0;
    this.documents = [];
    this.hasMoreData = true;
    this.loadDocuments();
  }

  loadDocuments() {
    if (!this.hasMoreData || this.isLoading) return;

    this.isLoading = true;
    let sortCol = 'DocumentDate';
    let sortDir = 'desc';

    if (this.sort && this.sort.active) {
      sortCol = this.sort.active;
      sortDir = this.sort.direction || 'asc';
    }

    this.billingService.getAll(this.documentType, this.currentPage, this.pageSize, this.filterValue, sortCol, sortDir)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.documents = [...this.documents, ...res.data];
            this.dataSource.data = this.documents;

            if (res.data.length < this.pageSize) {
              this.hasMoreData = false;
            } else {
              this.currentPage++;
            }
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching documents:', err);
          this.isLoading = false;
        }
      });
  }

  onScroll(event: any) {
    const target = event.target;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
      this.loadDocuments();
    }
  }

  onSwipe(id: number, action: 'open' | 'close') {
    this.swipedInvoiceId = action === 'open' ? id : null;
  }

  openDialog(row?: any) {
    const dialogRef = this.dialog.open(SalesInvoiceDialogComponent, {
      width: '1200px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      disableClose: false,
      data: { id: row?.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.resetAndLoad();
      }
    });
  }

  deleteDocument(row: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Delete',
        message: `Are you sure you want to delete invoice ${row.documentNo}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.billingService.delete(row.id).subscribe({
          next: (res) => {
            if (res.isSuccess) {
              this.snackBar.open('Invoice deleted', 'Close', { duration: 3000 });
              this.resetAndLoad();
            }
          }
        });
      }
    });
  }

  // --- PDF Generation Logic ---
  
  private loadCompanyProfile(): void {
    this.profileService.getProfile().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.companyProfile = response.data.companyProfile;
        } else {
          console.error('Failed to load company profile:', response.message);
        }
      },
      error: (err) => console.error('Error loading company profile:', err)
    });
  }

  generatePdf(row: any): void {
    if (!this.companyProfile) {
      this.snackBar.open("Company profile is not loaded yet. Please try again in a moment.", 'Close', { duration: 5000 });
      return;
    }

    this.isPdfLoading = true;
    this.selectedInvoiceId = row.id;
    
    // Fetch full invoice details
    this.billingService.getById(row.id)
      .pipe(finalize(() => {
        this.isPdfLoading = false;
        this.selectedInvoiceId = null;
      }), takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.isSuccess && response.data) {
            this._createPdf(response.data, this.companyProfile!);
          } else {
            this.snackBar.open("Error: Failed to fetch invoice details for PDF.", 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        },
        error: () => {
          this.snackBar.open("Failed to load details for PDF. Please try again.", 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      });
  }

  private _createPdf(invoice: any, companyProfile: CompanyProfileDto): void {
    const doc = new jsPDF();
    const margin = 10;
    const pageWidth = doc.internal.pageSize.width;
    const rightX = pageWidth - margin;

    // 1. Header
    let currentY = this.setupPdfHeader(doc, companyProfile, margin);

    // 2. Info Block (Bill To & Invoice Details)
    let leftY = currentY;
    let rightY = currentY;

    // --- Left: Bill To Details ---
    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("Bill To:", margin, leftY);
    leftY += 4;

    doc.setFontSize(10).setFont("helvetica", "bold");
    doc.text((invoice.contactName || 'Cash / Guest').toUpperCase(), margin, leftY);
    leftY += 5;

    doc.setFontSize(9).setFont("helvetica", "normal");
    if (invoice.contactPhone) {
      doc.text(`Mo: ${invoice.contactPhone}`, margin, leftY);
      leftY += 4;
    }

    // --- Right: Invoice Details ---
    doc.setFontSize(12).setFont("helvetica", "bold");
    doc.text("SALES INVOICE", rightX, rightY, { align: 'right' });
    rightY += 6;

    doc.setFontSize(9).setFont("helvetica", "bold");
    doc.text(`Invoice No: ${invoice.documentNo || '-'}`, rightX, rightY, { align: 'right' });
    rightY += 5;

    doc.setFontSize(9).setFont("helvetica", "normal");
    const invDateStr = invoice.documentDate ? this.datePipe.transform(invoice.documentDate, 'dd MMM yyyy') : '-';
    doc.text(`Date: ${invDateStr}`, rightX, rightY, { align: 'right' });
    rightY += 5;

    // Sync Y position
    currentY = Math.max(leftY, rightY) + 6;

    // 3. Items Table
    const tableHead = [['#', 'Item / Product', 'Qty', 'Rate', 'Total']];
    const tableBody = (invoice.items || []).map((item: any, i: number) => {
      let desc = item.itemName || 'Unknown Item';
      if (item.description) {
        desc += `\n${item.description}`;
      }
      return [
        (i + 1).toString(),
        desc,
        item.qty?.toString() || '0',
        `${(item.rateWithoutTax || 0).toFixed(2)}`,
        `${(item.totalAmount || 0).toFixed(2)}`
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: tableHead,
      body: tableBody,
      theme: 'plain',
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        valign: 'middle',
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
        1: { cellWidth: 'auto' }, 
        2: { cellWidth: 20, halign: 'center' },     
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }      
      }
    });

    // 4. Summary & Totals
    const finalY = (doc as any).lastAutoTable.finalY;
    this.addInvoiceSummary(doc, invoice, finalY, margin);
    this.addGlobalPageFooters(doc, margin);

    // 5. Save
    doc.save(`SalesInvoice_${invoice.documentNo || 'Doc'}.pdf`);
  }

  private setupPdfHeader(doc: jsPDF, companyProfile: CompanyProfileDto, margin: number): number {
    const pageWidth = doc.internal.pageSize.width;
    const centerX = pageWidth / 2;
    let currentY = 10;

    const centerText = (text: string, y: number, fontSize: number, fontStyle: string = 'normal') => {
      doc.setFont("helvetica", fontStyle).setFontSize(fontSize);
      doc.text(text, centerX, y, { align: 'center' });
    };

    doc.setTextColor(0);
    centerText(companyProfile.companyName || 'COMPANY NAME', currentY, 14, 'bold');
    currentY += 5;

    doc.setFont("helvetica", "normal").setFontSize(8);
    const address = [companyProfile.addressLine1, companyProfile.addressLine2, companyProfile.city, companyProfile.postalCode].filter(Boolean).join(', ');
    const addressLines = doc.splitTextToSize(address, pageWidth - (margin * 2));
    doc.text(addressLines, centerX, currentY, { align: 'center' });
    currentY += (addressLines.length * 4);

    const contact = [
      companyProfile.contactPhone ? `Ph: ${companyProfile.contactPhone}` : '',
      companyProfile.contactEmail ? `Email: ${companyProfile.contactEmail}` : ''
    ].filter(Boolean).join(' | ');
    if (contact) {
      doc.text(contact, centerX, currentY, { align: 'center' });
      currentY += 5;
    }

    doc.setLineWidth(0.3);
    doc.setDrawColor(0);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    return currentY + 6;
  }

  private addInvoiceSummary(doc: jsPDF, invoice: any, lastY: number, margin: number): void {
    const pageWidth = doc.internal.pageSize.width;
    let fy = lastY + 2;

    doc.setDrawColor(200);
    doc.setLineWidth(0.1);
    doc.line(margin, fy, pageWidth - margin, fy);
    fy += 5;

    const rightColX = pageWidth - margin;
    const labelX = rightColX - 35;
    
    // Notes section (Left side)
    doc.setFont("helvetica", "bold").setFontSize(8);
    doc.text("Notes:", margin, fy);
    doc.setFont("helvetica", "normal");
    
    const notesText = invoice.internalNotes || "Thank you for your business.";
    const splitNotes = doc.splitTextToSize(notesText, pageWidth / 2);
    doc.text(splitNotes, margin, fy + 4);

    // Totals section (Right side)
    doc.setFont("helvetica", "normal").setFontSize(9);
    
    doc.text("Basic Amount:", labelX, fy, { align: 'right' });
    doc.text(`${(invoice.basicAmount || 0).toFixed(2)}`, rightColX, fy, { align: 'right' });
    fy += 5;

    if (invoice.totalDiscount > 0) {
      doc.text(`Discount (${invoice.invoiceDiscountType || '%'}):`, labelX, fy, { align: 'right' });
      doc.text(`- ${(invoice.totalDiscount).toFixed(2)}`, rightColX, fy, { align: 'right' });
      fy += 5;
    }

    if (invoice.roundOff !== 0) {
      doc.text("Round Off:", labelX, fy, { align: 'right' });
      doc.text(`${(invoice.roundOff).toFixed(2)}`, rightColX, fy, { align: 'right' });
      fy += 5;
    }

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("Net Payable:", labelX, fy, { align: 'right' });
    doc.text(`${(invoice.netPayable || 0).toFixed(2)}`, rightColX, fy, { align: 'right' });
    fy += 2;

    doc.setLineWidth(0.3);
    doc.setDrawColor(0);
    doc.line(labelX - 10, fy, rightColX, fy);
    
    // Signature block
    fy += 25;
    doc.setFont("helvetica", "bold").setFontSize(9);
    doc.text("Authorised Signature", rightColX, fy, { align: 'right' });
    doc.setLineWidth(0.1);
    doc.line(rightColX - 40, fy - 5, rightColX, fy - 5);
  }

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
      
      doc.setTextColor(150);
      doc.text("Generated using ", margin, footerY);
      const prefixW = doc.getTextWidth("Generated using ");
      doc.setTextColor(99, 91, 255);
      doc.textWithLink("https://replezy.com/", margin + prefixW, footerY, { url: 'https://replezy.com/' });

      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, footerY, { align: 'right' });
    }
  }
}
