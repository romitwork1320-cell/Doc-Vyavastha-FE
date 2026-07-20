import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StudentFeePlanService } from '../../../../services/student-fee-plan.service';
import { FeeTypeService } from '../../../../services/fee-type.service';
import { FeeType } from '../../../../models/fee.models';

@Component({
  selector: 'app-fee-plan-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TablerIconsModule],
  template: `
    <div class="dialog-container" style="display:flex; flex-direction:column; background:#fff; border-radius:12px;">
      <div class="dialog-header" style="display:flex; justify-content:space-between; padding:20px; border-bottom:1px solid #f1f5f9; background:#f8fafc;">
        <h2 style="margin:0; font-size:18px; font-weight:600;">Add Fee Plan</h2>
        <button style="border:none; background:none; cursor:pointer;" (click)="close()">
          <i-tabler name="x" style="width:20px;height:20px; color:#64748b"></i-tabler>
        </button>
      </div>

      <div class="dialog-content" style="padding:24px;">
        <form [formGroup]="form" style="display:flex; flex-direction:column; gap:16px;">
          
          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:13px; font-weight:600; color:#334155;">Fee Type <span style="color:#ef4444">*</span></label>
            <select formControlName="feeTypeId" style="padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit; background:#fff;">
              <option value="" disabled selected>Select a fee type...</option>
              <option *ngFor="let ft of feeTypes" [value]="ft.id">{{ ft.name }}</option>
            </select>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:13px; font-weight:600; color:#334155;">Total Amount (₹) <span style="color:#ef4444">*</span></label>
            <input type="number" formControlName="totalAmount" style="padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit;" placeholder="0">
          </div>
          
          <div style="display:flex; gap:16px;">
            <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
              <label style="font-size:13px; font-weight:600; color:#334155;">Discount Amount (₹)</label>
              <input type="number" formControlName="discountAmount" style="padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit;" placeholder="0">
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; flex:2;">
              <label style="font-size:13px; font-weight:600; color:#334155;">Discount Reason</label>
              <input type="text" formControlName="discountReason" style="padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit;" placeholder="Reason for discount">
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:13px; font-weight:600; color:#334155;">Remarks</label>
            <textarea formControlName="remarks" rows="3" style="padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit;" placeholder="Additional notes..."></textarea>
          </div>

        </form>
      </div>
      
      <div class="dialog-footer" style="padding:16px 24px; border-top:1px solid #f1f5f9; background:#f8fafc; display:flex; justify-content:flex-end; gap:12px;">
        <button style="padding:8px 16px; border:1px solid #cbd5e1; background:#fff; border-radius:6px; cursor:pointer;" (click)="close()" [disabled]="isSaving">Cancel</button>
        <button style="padding:8px 16px; border:none; background:#6366f1; color:#fff; border-radius:6px; cursor:pointer; font-weight:600;" (click)="save()" [disabled]="form.invalid || isSaving">
          {{ isSaving ? 'Saving...' : 'Create Plan' }}
        </button>
      </div>
    </div>
  `
})
export class FeePlanDialogComponent implements OnInit {
  isSaving = false;
  form: FormGroup;
  feeTypes: FeeType[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<FeePlanDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { studentId: string },
    private service: StudentFeePlanService,
    private typeService: FeeTypeService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      studentId: [data.studentId, Validators.required],
      feeTypeId: ['', Validators.required],
      feeName: [''],
      totalAmount: ['', [Validators.required, Validators.min(1)]],
      discountAmount: [0, Validators.min(0)],
      discountReason: [''],
      remarks: ['']
    });

    this.form.get('feeTypeId')?.valueChanges.subscribe(id => {
      const selected = this.feeTypes.find(f => f.id === id);
      if (selected) {
        this.form.patchValue({
          feeName: selected.name,
          totalAmount: selected.amount
        });
      }
    });
  }

  ngOnInit() {
    this.typeService.getAll().subscribe((res: any) => {
      if (res.success) this.feeTypes = res.data || [];
    });
  }

  save() {
    if (this.form.invalid) return;
    this.isSaving = true;
    
    this.service.create(this.form.value).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.snackBar.open('Fee Plan created!', 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        } else {
          this.snackBar.open('Failed to create plan', 'Close');
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
