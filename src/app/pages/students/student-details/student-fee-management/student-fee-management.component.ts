import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { StudentFeePlanService } from '../../../../services/student-fee-plan.service';
import { StudentPaymentService } from '../../../../services/student-payment.service';
import { FeeTypeService } from '../../../../services/fee-type.service';
import { StudentFeePlan, StudentPayment, FeeType } from '../../../../models/fee.models';
import { forkJoin, Subject, distinctUntilChanged, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';
import { FeePlanDialogComponent } from './fee-plan-dialog.component';
import { PaymentDialogComponent } from './payment-dialog.component';
import { StudentService } from '../../../../services/student.service';
import { BranchService } from '../../../../services/branch.service';
import { ProfileService } from '../../../../services/profile.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-student-fee-management',
  standalone: true,
  imports: [CommonModule, TablerIconsModule, MatCheckboxModule],
  templateUrl: './student-fee-management.component.html',
  styles: [`
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .summary-card { background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    .summary-label { font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-val { font-size: 24px; font-weight: 700; color: #0f172a; }
    .val-success { color: #22c55e; }
    .val-warning { color: #f59e0b; }
    .val-info { color: #3b82f6; }
    
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .section-title { font-size: 16px; font-weight: 600; color: #0f172a; margin: 0; }
    .btn-add { background: #6366f1; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s; }
    .btn-add:hover { background: #4f46e5; }
    
    .fee-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 32px; }
    .fee-table th { background: #f8fafc; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    .fee-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; }
    .fee-table tr:last-child td { border-bottom: none; }
    .fee-table th.text-right, .fee-table td.text-right { text-align: right; }
    
    .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-pending { background: #fef3c7; color: #d97706; }
    .status-partial { background: #e0f2fe; color: #0284c7; }
    .status-paid { background: #dcfce3; color: #16a34a; }

    .action-btns { display: flex; gap: 4px; justify-content: flex-end; }
    .icon-btn { width: 28px; height: 28px; border: none; background: transparent; color: #64748b; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .icon-btn:hover { background: #f1f5f9; color: #0f172a; }
    .text-red { color: #ef4444; }
    .text-info { color: #0ea5e9; }
  `]
})
export class StudentFeeManagementComponent implements OnInit {
  @Input() studentId!: string;

  plans = signal<StudentFeePlan[]>([]);
  payments = signal<StudentPayment[]>([]);
  feeTypes = signal<FeeType[]>([]);
  selectedPayments = signal<Set<string>>(new Set());

  totalFee = signal(0);
  totalDiscount = signal(0);
  netFee = signal(0);
  totalCollected = signal(0);
  totalPending = signal(0);
  totalPlans = signal(0);
  totalPayments = signal(0);

  isLoading = true;

  private destroy$ = new Subject<void>();

  constructor(
    private planService: StudentFeePlanService,
    private paymentService: StudentPaymentService,
    private typeService: FeeTypeService,
    private studentService: StudentService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private branchService: BranchService,
    private profileService: ProfileService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.activeBranchId$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged()
    ).subscribe(branchId => {
      if (branchId && this.studentId) {
        this.loadData();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.isLoading = true;
    forkJoin({
      plans: this.planService.getAll(this.studentId),
      payments: this.paymentService.getAll(this.studentId),
      types: this.typeService.getAll()
    }).subscribe({
      next: (res) => {
        if (res.types.success) this.feeTypes.set(res.types.data || []);
        
        const paymentsData = res.payments.data || [];
        const plansData = res.plans.data || [];
        console.log('FEE PLANS DATA:', plansData);
        console.log('PAYMENTS DATA:', paymentsData);
        console.log('RAW RES PAYMENTS:', res.payments);

        // Map data and calculate Plan status
        let tFee = 0;
        let tDisc = 0;
        let tNet = 0;
        let tCol = 0;

        const mappedPlans = plansData.map((p: any) => {
          let feeTypeName = p.feeName;
          if (!feeTypeName && p.feeTypeId) {
             const type = this.feeTypes().find(t => t.id === p.feeTypeId);
             feeTypeName = type ? type.name : 'Unknown';
          }

          const planPayments = paymentsData.filter((pay: any) => pay.studentFeePlanId === p.id);
          const collected = planPayments.reduce((sum: number, pay: any) => sum + (pay.amount || 0), 0);
          
          const discount = p.discountAmount || 0;
          const netAmount = p.totalAmount - discount;
          const pending = netAmount - collected;
          
          let status: 'Pending' | 'Partially Paid' | 'Paid' = 'Pending';
          if (collected >= netAmount) status = 'Paid';
          else if (collected > 0) status = 'Partially Paid';

          tFee += p.totalAmount;
          tDisc += discount;
          tNet += netAmount;
          tCol += collected;

          return {
            ...p,
            feeTypeName,
            collected,
            pending,
            status
          };
        });

        const mappedPayments = paymentsData.map((pay: any) => {
          const plan = mappedPlans.find((p: any) => p.id === pay.studentFeePlanId);
          return {
            ...pay,
            feeTypeName: plan?.feeTypeName || 'Unknown'
          };
        });

        // Sort payments by date desc
        mappedPayments.sort((a: any,b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

        this.plans.set(mappedPlans);
        this.payments.set(mappedPayments);
        
        this.totalFee.set(tFee);
        this.totalDiscount.set(tDisc);
        this.netFee.set(tNet);
        this.totalCollected.set(tCol);
        this.totalPending.set(tNet - tCol);
        this.totalPlans.set(mappedPlans.length);
        this.totalPayments.set(res.payments.data?.length || 0);
        this.selectedPayments.set(new Set()); // Reset selection on reload
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  openPlanDialog() {
    const dialogRef = this.dialog.open(FeePlanDialogComponent, {
      width: '90vw',
      maxWidth: '500px',
      data: { studentId: this.studentId },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadData();
    });
  }

  openPaymentDialog() {
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '90vw',
      maxWidth: '600px',
      data: { studentId: this.studentId, plans: this.plans() },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadData();
    });
  }

  deletePlan(id: string) {
    const hasPayments = this.payments().some(p => p.studentFeePlanId === id);
    if (hasPayments) {
      this.snackBar.open('Cannot delete fee plan. Payments already exist.', 'Close', { duration: 4000 });
      return;
    }
    
    if (confirm('Are you sure you want to delete this fee plan?')) {
      this.planService.delete(id).subscribe((res: any) => {
        if (res.success) {
          this.snackBar.open('Plan deleted successfully', 'OK', { duration: 3000 });
          this.loadData();
        }
      });
    }
  }

  deletePayment(id: string) {
    if (confirm('Are you sure you want to delete this payment?')) {
      this.paymentService.delete(id).subscribe((res: any) => {
        if (res.success) {
          this.snackBar.open('Payment deleted successfully', 'OK', { duration: 3000 });
          this.loadData();
        }
      });
    }
  }

  togglePaymentSelection(paymentId: string) {
    const current = new Set(this.selectedPayments());
    if (current.has(paymentId)) current.delete(paymentId);
    else current.add(paymentId);
    this.selectedPayments.set(current);
  }

  toggleAllPayments() {
    const current = this.selectedPayments();
    if (current.size === this.payments().length && this.payments().length > 0) {
      this.selectedPayments.set(new Set()); // deselect all
    } else {
      this.selectedPayments.set(new Set(this.payments().map(p => p.id))); // select all
    }
  }

  isAllSelected() {
    return this.payments().length > 0 && this.selectedPayments().size === this.payments().length;
  }

  downloadConsolidatedReceipt() {
    const selectedIds = this.selectedPayments();
    const paymentsToInclude = selectedIds.size > 0 
      ? this.payments().filter(p => selectedIds.has(p.id)) 
      : this.payments();
    
    if (paymentsToInclude.length > 0) {
      this.downloadReceipt(paymentsToInclude);
    }
  }

  downloadReceipt(paymentData: any | any[]) {
    const paymentsList = Array.isArray(paymentData) ? paymentData : [paymentData];
    if (paymentsList.length === 0) return;

    this.studentService.getById(this.studentId).subscribe(res => {
      if (res.success && res.data) {
        const student = res.data;
        
        const generatePdf = (branch: any = null, company: any = null) => {
          const doc = new jsPDF();
          
          const pageWidth = doc.internal.pageSize.getWidth();
          const centerX = pageWidth / 2;

          // --- HEADER (Centered) ---
          const companyName = company?.companyName || 'COMPANY NAME';
          doc.setFontSize(16);
          doc.setTextColor(20, 20, 20);
          doc.setFont('helvetica', 'bold');
          doc.text(companyName.toUpperCase(), centerX, 20, { align: 'center' });
          
          let currentY = 26;
          
          if (branch?.name && branch.name.trim().toLowerCase() !== companyName.trim().toLowerCase()) {
            doc.setFontSize(11);
            doc.text(`Branch: ${branch.name}`, centerX, currentY, { align: 'center' });
            currentY += 6;
          }
          
          doc.setFontSize(9);
          doc.setTextColor(40, 40, 40);
          doc.setFont('helvetica', 'normal');
          let addressText = branch?.address || company?.addressLine1 || '';
          if (addressText) {
            addressText = addressText.replace(/\n/g, ', ');
            doc.text(addressText, centerX, currentY, { align: 'center' });
            currentY += 5;
          }
          
          const phone = branch?.contact || company?.contactPhone || company?.supportPhone || '';
          const email = company?.contactEmail || '';
          let contactStr = [];
          if (phone) contactStr.push(`Ph: ${phone}`);
          if (email) contactStr.push(`Email: ${email}`);
          if (contactStr.length > 0) {
            doc.text(contactStr.join(' | '), centerX, currentY, { align: 'center' });
            currentY += 8;
          } else {
            currentY += 3;
          }

          // Top Divider Line
          doc.setDrawColor(40, 40, 40);
          doc.setLineWidth(0.5);
          doc.line(14, currentY, 196, currentY);
          currentY += 6;
          
          // --- DETAILS SECTION ---
          // Left side: Received From
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          doc.text('Received From:', 14, currentY);
          
          doc.setTextColor(20, 20, 20);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          const studentName = student.fullName || 'Student Name';
          doc.text(studentName.toUpperCase(), 14, currentY + 5);
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(40, 40, 40);
          let studentDetailsY = currentY + 11;
          
          if (student.studentCode) {
            doc.text(`Code: ${student.studentCode}`, 14, studentDetailsY);
            studentDetailsY += 5;
          }
          
          if (student.primaryMobile) {
            doc.text(`Mo: ${student.primaryMobile}`, 14, studentDetailsY);
            studentDetailsY += 5;
          }

          // Right side: Document Info
          doc.setTextColor(60, 60, 60);
          doc.setFont('helvetica', 'normal');
          doc.text('Document Type:', 196, currentY, { align: 'right' });
          
          doc.setTextColor(20, 20, 20);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.text('RECEIPT', 196, currentY + 5, { align: 'right' });
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(40, 40, 40);
          const receiptNoStr = paymentsList.length === 1 
            ? (paymentsList[0].receiptNumber || paymentsList[0].paymentNumber || 'N/A') 
            : `REC-MUL-${new Date().getTime().toString().slice(-4)}`;
          doc.text(`Ref No: ${receiptNoStr}`, 196, currentY + 11, { align: 'right' });
          
          const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          doc.text(`Date: ${dateStr}`, 196, currentY + 16, { align: 'right' });
          
          currentY += 28;

          // Message
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 100, 100);
          doc.text('Acknowledged receipt of the following fee payments:', 14, currentY);
          currentY += 5;

          // --- TABLE ---
          let index = 1;
          const tableBody = paymentsList.map(p => [
            index++,
            p.feeTypeName,
            p.paymentMethod || 'Cash',
            `Rs. ${p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
          ]);

          autoTable(doc, {
            startY: currentY,
            head: [['#', 'Fee Details', 'Payment Method', 'Amount (INR)']],
            body: tableBody,
            theme: 'plain', 
            headStyles: { fillColor: [242, 242, 242], textColor: [20, 20, 20], fontStyle: 'bold', halign: 'left' },
            bodyStyles: { textColor: [40, 40, 40] },
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
            columnStyles: { 
              0: { cellWidth: 10, halign: 'center' },
              1: { cellWidth: 'auto' },
              2: { cellWidth: 50 },
              3: { cellWidth: 40, halign: 'right' } 
            }
          });
  
          let finalY = (doc as any).lastAutoTable.finalY + 10;
          
          // Bottom Divider
          doc.setDrawColor(40, 40, 40);
          doc.line(14, finalY, 196, finalY);
          finalY += 8;

          // --- FOOTER ---
          doc.setFontSize(11);
          doc.setTextColor(20, 20, 20);
          doc.setFont('helvetica', 'bold');
          doc.text(`Total Items: ${paymentsList.length}`, 14, finalY);
          
          finalY += 10;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Notes: ', 14, finalY);
          doc.setFont('helvetica', 'normal');
          doc.text('Subject to service terms & conditions. Fees once paid are non-refundable.', 24, finalY);

          // Signature Line
          doc.setDrawColor(40, 40, 40);
          doc.line(150, finalY + 30, 196, finalY + 30);
          doc.setFont('helvetica', 'bold');
          doc.text('Authorised Signature', 196, finalY + 35, { align: 'right' });
  
          const fileName = paymentsList.length === 1 
            ? `Invoice_${paymentsList[0].receiptNumber || paymentsList[0].paymentNumber || 'Download'}.pdf`
            : `Consolidated_Invoice_${student.studentCode || 'Download'}.pdf`;

          doc.save(fileName);
        };

        const branchId = this.authService.getActiveBranchId();
        const branchReq = branchId ? this.branchService.getBranch(branchId) : of({ data: null });
        const profileReq = this.profileService.getProfile();
        
        forkJoin([branchReq, profileReq]).subscribe({
          next: ([branchRes, profileRes]) => {
            const companyProfile = profileRes?.success ? profileRes.data?.companyProfile : null;
            const branchData = branchRes?.data || null;
            generatePdf(branchData, companyProfile);
          },
          error: () => {
            generatePdf(null, null);
          }
        });
      } else {
        this.snackBar.open('Could not fetch student details for receipt.', 'Close', { duration: 3000 });
      }
    });
  }
}
