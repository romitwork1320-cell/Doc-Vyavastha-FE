import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormTypeService } from '../../../services/form-type.service';
import { FormType } from '../../../models/student.models';

@Component({
  selector: 'app-form-type-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TablerIconsModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="dialog-header p-24 d-flex align-items-center justify-content-between border-bottom" style="overflow-x: hidden;">
      <h4 class="mat-headline-6 m-0">{{ isEdit ? 'Edit Form Type' : 'Create Form Type' }}</h4>
      <button class="close-btn" (click)="close()">
        <i-tabler name="x" class="icon-20"></i-tabler>
      </button>
    </div>

    <mat-dialog-content class="mat-typography" style="padding-top: 16px; overflow-x: hidden;">
      <form [formGroup]="form" class="crm-form">
        <div class="form-group">
          <label>Name <span class="required">*</span></label>
          <input type="text" formControlName="name" class="crm-input" placeholder="Ex: Admission">
        </div>
        
        <div class="form-group">
          <label>Description</label>
          <textarea formControlName="description" class="crm-input" placeholder="Description..." rows="3"></textarea>
        </div>

        <div class="form-group">
          <label>Status <span class="required">*</span></label>
          <select formControlName="status" class="crm-input">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
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
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 600; color: #334155; }
    .required { color: #ef4444; }
    
    .crm-input { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; color: #334155; outline: none; transition: all 0.2s; background: #fff; font-family: inherit; }
    textarea.crm-input { resize: vertical; }
    .crm-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }

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
export class FormTypeDialogComponent {
  isSaving = false;
  isEdit = false;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<FormTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Partial<FormType>,
    private service: FormTypeService,
    private snackBar: MatSnackBar
  ) {
    this.isEdit = !!data.id;
    this.form = this.fb.group({
      name: [data.name || '', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: [data.description || ''],
      status: [data.status || 'Active', Validators.required]
    });
  }

  save() {
    if (this.form.invalid) return;
    this.isSaving = true;
    
    const payload = { ...this.data, ...this.form.getRawValue() };

    const request$ = this.isEdit 
      ? this.service.update(payload.id!, payload)
      : this.service.create(payload as FormType);

    request$.subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open(res.message || 'Saved successfully!', 'OK', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'top' });
          this.dialogRef.close(true);
        } else {
          this.snackBar.open(res.message || 'Failed to save', 'Close', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'top' });
          this.isSaving = false;
        }
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Error saving form type';
        this.snackBar.open(msg, 'Close', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'top' });
        this.isSaving = false;
      }
    });
  }

  close() {
    this.dialogRef.close(false);
  }
}
