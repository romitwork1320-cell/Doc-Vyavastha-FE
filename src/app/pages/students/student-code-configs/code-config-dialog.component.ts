import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StudentCodeConfigurationService } from '../../../services/student-code-configuration.service';
import { StudentCategoryService } from '../../../services/student-category.service';
import { StudentCategory } from '../../../models/student.models';

@Component({
  selector: 'app-code-config-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TablerIconsModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="dialog-header p-24 d-flex align-items-center justify-content-between border-bottom" style="overflow-x: hidden;">
      <h4 class="mat-headline-6 m-0">{{ isEdit ? 'Edit Code Config' : 'Create Code Config' }}</h4>
      <button class="close-btn" (click)="close()">
        <i-tabler name="x" class="icon-20"></i-tabler>
      </button>
    </div>

    <mat-dialog-content class="mat-typography" style="padding-top: 16px; overflow-x: hidden;">
      <form [formGroup]="form" class="crm-form">
        <div class="form-row">
          <div class="form-group">
            <label>Category <span class="required">*</span></label>
            <select formControlName="categoryId" class="crm-input" [attr.disabled]="isEdit ? true : null">
              <option value="" disabled>Select Category</option>
              <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Business Year <span class="required">*</span></label>
            <input type="number" formControlName="businessYear" class="crm-input" placeholder="Ex: 2024">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Prefix <span class="required">*</span></label>
            <input type="text" formControlName="prefix" class="crm-input" placeholder="Ex: COM">
          </div>
          
          <div class="form-group">
            <label>Separator <span class="required">*</span></label>
            <input type="text" formControlName="separator" class="crm-input" placeholder="Ex: -">
          </div>
        </div>



        <div class="form-group" style="flex-direction: row; align-items: center; gap: 12px;">
          <input type="checkbox" formControlName="resetSequence" id="resetSeq">
          <label for="resetSeq" style="cursor: pointer; margin: 0; font-weight: normal;">Reset Sequence Yearly</label>
        </div>

        <div class="form-group" style="flex-direction: row; align-items: center; gap: 12px;">
          <input type="checkbox" formControlName="isActive" id="isActive">
          <label for="isActive" style="cursor: pointer; margin: 0; font-weight: normal;">Is Active</label>
        </div>

      </form>
    </mat-dialog-content>
    
    <div class="dialog-footer">
      <button class="btn-cancel" (click)="close()" [disabled]="isSaving">Cancel</button>
      <button class="btn-submit" (click)="save()" [disabled]="form.invalid || isSaving">
        {{ isSaving ? 'Saving...' : (isEdit ? 'Update' : 'Create') }}
      </button>
    </div>
  `,
  styles: [`
    .crm-form { display: flex; flex-direction: column; gap: 16px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 600; color: #334155; }
    .required { color: #ef4444; }
    
    .crm-input { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; color: #334155; outline: none; transition: all 0.2s; background: #fff; font-family: inherit; }
    .crm-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
    .crm-input[disabled] { background-color: #f8fafc; color: #94a3b8; cursor: not-allowed; }

    .close-btn { background: #f1f5f9; border: none; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center; border-radius: 6px; padding: 6px; transition: 0.2s; }
    .close-btn:hover { background: #e2e8f0; color: #0f172a; }
    
    .dialog-footer { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #f1f5f9; background: #fff; margin-top: 8px; }
    .btn-cancel { padding: 9px 16px; border: 1px solid #cbd5e1; background: #fff; color: #475569; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: 0.2s; }
    .btn-cancel:hover { background: #f1f5f9; color: #0f172a; }
    .btn-submit { padding: 9px 20px; border: none; background: #8b5cf6; color: #fff; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: 0.2s; }
    .btn-submit:hover:not([disabled]) { background: #7c3aed; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139,92,246,0.25); }
    .btn-submit[disabled] { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class CodeConfigDialogComponent implements OnInit {
  isSaving = false;
  isEdit = false;
  form: FormGroup;
  categories: StudentCategory[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CodeConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private service: StudentCodeConfigurationService,
    private catService: StudentCategoryService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.isEdit = !!data.id;
    this.form = this.fb.group({
      categoryId: [{ value: data.categoryId || '', disabled: this.isEdit }, Validators.required],
      businessYear: [data.businessYear || new Date().getFullYear(), Validators.required],
      prefix: [data.prefix || '', Validators.required],
      separator: [data.separator || '-', Validators.required],
      paddingLength: [1], // Default to 1, hidden from UI as per requirements
      resetSequence: [data.resetSequence !== false], // default true
      isActive: [data.isActive !== false] // default true
    });
  }

  ngOnInit() {
    this.catService.getAll().subscribe(res => {
      if (res.success && res.data) {
        this.categories = res.data;
        this.cdr.detectChanges();
      }
    });
  }

  save() {
    if (this.form.invalid) return;
    this.isSaving = true;
    
    // getRawValue to include disabled categoryId field
    const payload = { ...this.data, ...this.form.getRawValue() };

    const request$ = this.isEdit 
      ? this.service.update(payload.id!, payload)
      : this.service.create(payload);

    request$.subscribe({
      next: (res) => {
        if (res.success) {
          this.dialogRef.close(true);
        } else {
          this.isSaving = false;
        }
      },
      error: (err) => {
        this.isSaving = false;
      }
    });
  }

  close() {
    this.dialogRef.close(false);
  }
}
