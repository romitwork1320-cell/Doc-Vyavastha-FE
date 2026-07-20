import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StudentPaymentService } from '../../../../services/student-payment.service';
import { StudentFeePlan } from '../../../../models/fee.models';

@Component({
  selector: 'app-payment-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TablerIconsModule],
  template: `
    <div class="dialog-container" style="display:flex; flex-direction:column; background:#fff; border-radius:12px;">
      <div class="dialog-header" style="display:flex; justify-content:space-between; padding:20px; border-bottom:1px solid #f1f5f9; background:#f8fafc;">
        <h2 style="margin:0; font-size:18px; font-weight:600;">Record Payment</h2>
        <button style="border:none; background:none; cursor:pointer;" (click)="close()">
          <i-tabler name="x" style="width:20px;height:20px; color:#64748b"></i-tabler>
        </button>
      </div>

      <div class="dialog-content" style="padding:24px;">
        <form [formGroup]="form" style="display:flex; flex-direction:column; gap:16px;">
          
          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:13px; font-weight:600; color:#334155;">Fee Plan <span style="color:#ef4444">*</span></label>
            <select formControlName="studentFeePlanId" (change)="onPlanSelect()" style="padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit;">
              <option value="" disabled>Select Fee Plan</option>
              <option *ngFor="let p of availablePlans" [value]="p.id">
                {{ p.feeTypeName }} (Pending: ₹{{ p.pending }})
              </option>
            </select>
          </div>

          <div style="display:flex; gap:16px;">
            <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
              <label style="font-size:13px; font-weight:600; color:#334155;">Payment Date <span style="color:#ef4444">*</span></label>
              <input type="date" formControlName="paymentDate" style="padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit;">
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
              <label style="font-size:13px; font-weight:600; color:#334155;">Amount (₹) <span style="color:#ef4444">*</span></label>
              <input type="number" formControlName="amount" style="padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit;" placeholder="0">
              <small *ngIf="maxAmount > 0" style="color:#64748b;">Max: ₹{{maxAmount}}</small>
            </div>
          </div>

          <div style="display:flex; gap:16px;">
            <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
              <label style="font-size:13px; font-weight:600; color:#334155;">Payment Method <span style="color:#ef4444">*</span></label>
              <select formControlName="paymentMethod" style="padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit;">
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Card">Credit/Debit Card</option>
              </select>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
              <label style="font-size:13px; font-weight:600; color:#334155;">Reference Number</label>
              <input type="text" formControlName="referenceNumber" style="padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit;" placeholder="Txn ID/Cheque No">
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:13px; font-weight:600; color:#334155;">Remarks</label>
            <textarea formControlName="remarks" rows="2" style="padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit;"></textarea>
          </div>

        </form>
      </div>
      
      <div class="dialog-footer" style="padding:16px 24px; border-top:1px solid #f1f5f9; background:#f8fafc; display:flex; justify-content:flex-end; gap:12px;">
        <button style="padding:8px 16px; border:1px solid #cbd5e1; background:#fff; border-radius:6px; cursor:pointer;" (click)="close()" [disabled]="isSaving">Cancel</button>
        <button style="padding:8px 16px; border:none; background:#6366f1; color:#fff; border-radius:6px; cursor:pointer; font-weight:600;" (click)="save()" [disabled]="form.invalid || isSaving">
          {{ isSaving ? 'Recording...' : 'Record Payment' }}
        </button>
      </div>
    </div>
  `
})
export class PaymentDialogComponent implements OnInit {
  isSaving = false;
  form: FormGroup;
  availablePlans: StudentFeePlan[] = [];
  maxAmount = 0;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<PaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { studentId: string, plans: StudentFeePlan[] },
    private service: StudentPaymentService,
    private snackBar: MatSnackBar
  ) {
    this.availablePlans = data.plans.filter(p => (p.pending || 0) > 0);
    
    this.form = this.fb.group({
      studentId: [data.studentId, Validators.required],
      studentFeePlanId: ['', Validators.required],
      paymentDate: [new Date().toISOString().split('T')[0], Validators.required],
      amount: ['', [Validators.required, Validators.min(1)]],
      paymentMethod: ['Cash', Validators.required],
      referenceNumber: [''],
      remarks: ['']
    });
  }

  ngOnInit() {}

  onPlanSelect() {
    const planId = this.form.get('studentFeePlanId')?.value;
    const plan = this.availablePlans.find(p => p.id === planId);
    if (plan) {
      this.maxAmount = plan.pending || 0;
      this.form.get('amount')?.setValidators([Validators.required, Validators.min(1), Validators.max(this.maxAmount)]);
      this.form.get('amount')?.updateValueAndValidity();
    }
  }

  save() {
    if (this.form.invalid) return;
    this.isSaving = true;
    
    // ensure date is iso
    const payload = { ...this.form.value };
    payload.paymentDate = new Date(payload.paymentDate).toISOString();

    this.service.create(payload).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.snackBar.open('Payment recorded successfully!', 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        } else {
          this.snackBar.open('Failed to record payment', 'Close');
          this.isSaving = false;
        }
      },
      error: () => this.isSaving = false
    });
  }

  close() {
    this.dialogRef.close(false);
  }
}
