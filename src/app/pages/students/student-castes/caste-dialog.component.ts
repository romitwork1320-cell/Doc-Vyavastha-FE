import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { StudentCasteService } from '../../../services/student-caste.service';
import { StudentCaste } from '../../../models/student.models';

@Component({
  selector: 'app-caste-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TablerIconsModule, MatDialogModule, MatButtonModule],
  templateUrl: './caste-dialog.component.html',
  styles: [`
    .crm-form { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 600; color: #334155; }
    .required { color: #ef4444; }
    
    .crm-input {
      padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;
      color: #334155; outline: none; transition: all 0.2s; background: #fff; font-family: inherit;
    }
    textarea.crm-input { resize: vertical; }
    .crm-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
    .crm-input::placeholder { color: #94a3b8; }

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
export class CasteDialogComponent implements OnInit {
  casteForm: FormGroup;
  isEdit = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    
    private service: StudentCasteService,
    private dialogRef: MatDialogRef<CasteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { caste?: StudentCaste },
    private snackBar: MatSnackBar
  ) {
    this.isEdit = !!data?.caste;
    this.casteForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      status: ['Active', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.isEdit && this.data.caste) {
      this.casteForm.patchValue({
        name: this.data.caste.name,
        description: this.data.caste.description,
        status: this.data.caste.status
      });
    }
  }

  onSubmit(): void {
    if (this.casteForm.invalid) {
      Object.keys(this.casteForm.controls).forEach(key => {
        this.casteForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formData = this.casteForm.value;

    const request$ = this.isEdit
      ? this.service.update(this.data.caste!.id, formData)
      : this.service.create(formData);

    request$.subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open(`Caste ${this.isEdit ? 'updated' : 'created'} successfully`, 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        } else {
          this.snackBar.open(res.message || 'Error saving caste', 'Close', { duration: 3000 });
          this.isSubmitting = false;
        }
      },
      error: () => {
        this.snackBar.open('Something went wrong', 'Close', { duration: 3000 });
        this.isSubmitting = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
