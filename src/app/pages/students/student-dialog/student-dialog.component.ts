import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StudentService } from '../../../services/student.service';
import { StudentCategoryService } from '../../../services/student-category.service';
import { StudentCasteService } from '../../../services/student-caste.service';
import { FeeTypeService } from '../../../services/fee-type.service';
import { StudentCategory, StudentCaste } from '../../../models/student.models';
import { FeeType } from '../../../models/fee.models';

@Component({
  selector: 'app-student-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TablerIconsModule],
  templateUrl: './student-dialog.component.html',
  styles: [`
    .dialog-container { display: flex; flex-direction: column; background: #fff; border-radius: 12px; overflow: hidden; width: 100%; max-height: 90vh; }
    .dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; flex-shrink: 0; }
    .dialog-title { margin: 0; font-size: 18px; font-weight: 600; color: #0f172a; }
    .close-btn { background: transparent; border: none; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center; border-radius: 6px; padding: 4px; transition: 0.2s; }
    .close-btn:hover { background: #e2e8f0; color: #0f172a; }

    .dialog-content { padding: 24px; overflow-y: auto; }
    
    .crm-form { display: flex; flex-direction: column; gap: 24px; }
    .form-section { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; position: relative; }
    .form-section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
    
    .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .form-row:last-child { margin-bottom: 0; }
    
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 600; color: #334155; }
    .required { color: #ef4444; }
    
    .crm-input { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; color: #334155; outline: none; transition: all 0.2s; background: #fff; font-family: inherit; }
    textarea.crm-input { resize: vertical; }
    .crm-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
    .crm-input[disabled] { background-color: #f8fafc; color: #94a3b8; cursor: not-allowed; }
    
    .code-preview { font-family: monospace; font-size: 16px; font-weight: 700; color: #6366f1; background: #eef2ff; padding: 8px 12px; border-radius: 6px; display: inline-block; }
    
    .dialog-footer { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #f1f5f9; background: #f8fafc; flex-shrink: 0; }
    .btn-cancel { padding: 9px 16px; border: 1px solid #cbd5e1; background: #fff; color: #475569; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: 0.2s; }
    .btn-cancel:hover { background: #f1f5f9; color: #0f172a; }
    .btn-submit { padding: 9px 20px; border: none; background: #6366f1; color: #fff; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: 0.2s; }
    .btn-submit:hover:not([disabled]) { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.25); }
    .btn-submit[disabled] { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class StudentDialogComponent implements OnInit {
  isSaving = false;
  isEdit = false;
  studentForm: FormGroup;
  categories: StudentCategory[] = [];
  castes: StudentCaste[] = [];
  feeTypes: FeeType[] = [];
  expectedTotalFee: number | null = null;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<StudentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private studentService: StudentService,
    private catService: StudentCategoryService,
    private casteService: StudentCasteService,
    private feeTypeService: FeeTypeService,
    private snackBar: MatSnackBar
  ) {
    const student = data.student;
    this.isEdit = !!student?.id;

    this.studentForm = this.fb.group({
      categoryId: [student?.categoryId || '', Validators.required],
      casteId: [student?.casteId || ''],
      status: [student?.status || 'Active', Validators.required],
      
      fullName: [student?.fullName || '', Validators.required],
      fatherName: [student?.fatherName || ''],
      motherName: [student?.motherName || ''],
      gender: [student?.gender || 'Male', Validators.required],
      email: [student?.email || '', [Validators.email]],

      primaryMobile: [student?.primaryMobile || '', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      secondaryMobile: [student?.secondaryMobile || '', [Validators.pattern('^[0-9]{10}$')]],
      whatsAppMobile: [student?.whatsAppMobile || '', [Validators.pattern('^[0-9]{10}$')]],

      homeAddress: [student?.homeAddress || ''],
      city: [student?.city || ''],
      state: [student?.state || ''],
      pincode: [student?.pincode || ''],

      schoolName: [student?.schoolName || ''],
      passingBoard: [student?.passingBoard || ''],
      tenthPassingYear: [student?.tenthPassingYear || ''],
      twelfthPassingYear: [student?.twelfthPassingYear || ''],

      scholarshipUid: [student?.scholarshipUid || ''],
      scholarshipPassword: [student?.scholarshipPassword || ''],

      remarks: [student?.remarks || ''],

      // Initial Payment Controls
      initialPaymentAmount: [0, [Validators.min(0)]],
      initialPaymentMethod: ['Cash'],
      initialPaymentDate: [new Date().toISOString().split('T')[0]],
      initialPaymentReference: ['']
    });
  }

  ngOnInit() {
    this.catService.getAll().subscribe(res => {
      if (res.success) this.categories = res.data || [];
    });
    this.casteService.getAll({ pageIndex: 0, pageSize: 100 }).subscribe(res => {
      if (res.success) this.castes = res.data || [];
    });
    this.feeTypeService.getAll({ pageIndex: 0, pageSize: 100 }).subscribe(res => {
      if (res.success) this.feeTypes = res.data || [];
    });

    if (!this.isEdit) {
      this.studentForm.get('categoryId')?.valueChanges.subscribe(catId => {
        const paymentControl = this.studentForm.get('initialPaymentAmount');
        if (!catId) {
          this.expectedTotalFee = null;
          paymentControl?.setValidators([Validators.min(0)]);
          paymentControl?.updateValueAndValidity();
          return;
        }
        const ft = this.feeTypes.find(f => f.categoryIds && f.categoryIds.includes(catId));
        this.expectedTotalFee = ft ? ft.amount : null;
        
        if (this.expectedTotalFee !== null) {
          paymentControl?.setValidators([Validators.min(0), Validators.max(this.expectedTotalFee)]);
        } else {
          paymentControl?.setValidators([Validators.min(0)]);
        }
        paymentControl?.updateValueAndValidity();
      });
    }
  }

  close() {
    this.dialogRef.close();
  }

  save() {
    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      return;
    }
    this.isSaving = true;

    const formValue = this.studentForm.value;
    
    // Sanitize numeric fields to 0 instead of empty string
    const payload = {
      ...formValue,
      tenthPassingYear: formValue.tenthPassingYear ? parseInt(formValue.tenthPassingYear, 10) : 0,
      twelfthPassingYear: formValue.twelfthPassingYear ? parseInt(formValue.twelfthPassingYear, 10) : 0,
    };
    
    if (this.isEdit) {
      this.studentService.update(this.data.student.id, payload).subscribe({
        next: (res) => {
          if (res.success) {
            this.snackBar.open('Saved successfully!', 'OK', { duration: 3000 });
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(res.message || 'Failed to save', 'Close', { duration: 5000 });
            this.isSaving = false;
          }
        },
        error: (err) => {
          this.snackBar.open(`Error: ${err.message}`, 'Close', { duration: 5000 });
          this.isSaving = false;
        }
      });
    } else {
      this.studentService.create(payload).subscribe({
        next: (res) => {
          if (res.success) {
            this.snackBar.open('Student created successfully', 'OK', { duration: 3000 });
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(res.message || 'Failed to save', 'Close', { duration: 5000 });
            this.isSaving = false;
          }
        },
        error: (err) => {
          this.snackBar.open(`Error: ${err.error?.message || err.message}`, 'Close', { duration: 5000 });
          this.isSaving = false;
        }
      });
    }
  }
}
