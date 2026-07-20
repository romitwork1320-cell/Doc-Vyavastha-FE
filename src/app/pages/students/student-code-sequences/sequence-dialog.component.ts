import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StudentCodeSequenceService } from '../../../services/student-code-sequence.service';
import { StudentCodeConfigurationService } from '../../../services/student-code-configuration.service';
import { StudentCategoryService } from '../../../services/student-category.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-sequence-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TablerIconsModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="dialog-header p-24 d-flex align-items-center justify-content-between border-bottom" style="overflow-x: hidden;">
      <h4 class="mat-headline-6 m-0">{{ isEdit ? 'Edit Sequence' : 'Create Sequence' }}</h4>
      <button class="close-btn" (click)="close()">
        <i-tabler name="x" class="icon-20"></i-tabler>
      </button>
    </div>

    <mat-dialog-content class="mat-typography" style="padding-top: 16px; overflow-x: hidden;">
      <form [formGroup]="form" class="crm-form">
        <div class="form-group">
          <label>Configuration <span class="required">*</span></label>
          <select formControlName="yearConfigId" class="crm-input" [attr.disabled]="isEdit ? true : null">
            <option value="" disabled>Select Config (Category - Year)</option>
            <option *ngFor="let opt of configOptions" [value]="opt.id">{{ opt.label }}</option>
          </select>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Current Number <span class="required">*</span></label>
            <input type="number" formControlName="currentNumber" class="crm-input" placeholder="Ex: 1">
          </div>
          <div class="form-group">
            <label>Last Generated Code</label>
            <input type="text" formControlName="lastGeneratedCode" class="crm-input" placeholder="Ex: COM-2024-001">
          </div>
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
export class SequenceDialogComponent implements OnInit {
  isSaving = false;
  isEdit = false;
  form: FormGroup;
  configOptions: {id: string, label: string}[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<SequenceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private service: StudentCodeSequenceService,
    private confService: StudentCodeConfigurationService,
    private catService: StudentCategoryService,
    private snackBar: MatSnackBar
  ) {
    this.isEdit = !!data.id;
    this.form = this.fb.group({
      yearConfigId: [{ value: data.yearConfigId || '', disabled: this.isEdit }, Validators.required],
      currentNumber: [data.currentNumber || 1, [Validators.required, Validators.min(0)]],
      lastGeneratedCode: [data.lastGeneratedCode || '']
    });
  }

  ngOnInit() {
    forkJoin({
      configs: this.confService.getAll(),
      categories: this.catService.getAll()
    }).subscribe(({ configs, categories }) => {
      if (configs.success && configs.data && categories.success && categories.data) {
        const cats = categories.data;
        this.configOptions = configs.data.map(conf => {
          const cat = cats.find(c => c.id === conf.categoryId);
          const catName = cat ? cat.name : 'Unknown';
          return {
            id: conf.id,
            label: `${catName} - ${conf.businessYear} (${conf.prefix})`
          };
        });
      }
    });
  }

  save() {
    if (this.form.invalid) return;
    this.isSaving = true;
    
    const payload = { 
      ...this.data, 
      ...this.form.getRawValue(),
      updatedAt: new Date().toISOString()
    };

    const request$ = this.isEdit 
      ? this.service.update(payload.id!, payload)
      : this.service.create(payload);

    request$.subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open(res.message || 'Saved successfully!', 'OK', { duration: 3000 });
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
  }

  close() {
    this.dialogRef.close(false);
  }
}
