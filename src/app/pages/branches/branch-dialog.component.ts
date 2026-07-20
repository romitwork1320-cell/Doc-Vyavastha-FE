import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Branch, BranchService } from '../../services/branch.service';

@Component({
  selector: 'app-branch-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TablerIconsModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2>{{ isEditMode ? 'Edit Branch' : 'Add New Branch' }}</h2>
        <button mat-icon-button (click)="dialogRef.close()">
          <i-tabler name="x" style="width:18px;height:18px"></i-tabler>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Branch Name *</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Surat Branch" />
          <mat-error *ngIf="f['name'].hasError('required')">Name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Branch Code</mat-label>
          <input matInput formControlName="code" placeholder="e.g. SRT" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Contact Number</mat-label>
          <input matInput formControlName="contact" placeholder="e.g. +91 98765 43210" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Address</mat-label>
          <textarea matInput formControlName="address" placeholder="Full branch address" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            <mat-option value="Active">Active</mat-option>
            <mat-option value="Inactive">Inactive</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="dialog-actions">
          <button type="button" mat-stroked-button (click)="dialogRef.close()">Cancel</button>
          <button type="submit" mat-flat-button color="primary" [disabled]="isSubmitting">
            {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Update' : 'Create') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .dialog-container { padding: 24px; min-width: 460px; }
    .dialog-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .dialog-header h2 { margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .full-width { width: 100%; }
    .dialog-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
  `]
})
export class BranchDialogComponent {
  form: FormGroup;
  isEditMode: boolean;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<BranchDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Branch,
    private service: BranchService,
    private snackBar: MatSnackBar
  ) {
    this.isEditMode = !!data?.id;
    this.form = this.fb.group({
      name: [data?.name || '', [Validators.required, Validators.maxLength(255)]],
      code: [data?.code || ''],
      contact: [data?.contact || ''],
      address: [data?.address || ''],
      status: [data?.status || 'Active']
    });
  }

  get f() { return this.form.controls; }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting = true;
    const reqData = this.form.value;
    const req$ = this.isEditMode
      ? this.service.updateBranch(this.data.id, reqData)
      : this.service.createBranch(reqData);

    req$.subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open(`Branch ${this.isEditMode ? 'updated' : 'created'} successfully`, 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        } else {
          this.snackBar.open(res.message || 'Operation failed', 'Close', { duration: 3000 });
          this.isSubmitting = false;
        }
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'An error occurred', 'Close', { duration: 3000 });
        this.isSubmitting = false;
      }
    });
  }
}
