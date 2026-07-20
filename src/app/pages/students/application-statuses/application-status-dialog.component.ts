import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApplicationStatusService } from '../../../services/application-status.service';
import { ApplicationStatus } from '../../../models/student.models';

@Component({
  selector: 'app-application-status-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatInputModule, MatFormFieldModule, FormsModule],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit Application Status' : 'Create Application Status' }}</h2>
    <mat-dialog-content>
      <div class="d-flex flex-column gap-2" style="min-width: 350px; margin-top: 8px;">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Name</mat-label>
          <input matInput [(ngModel)]="data.name" placeholder="Ex: Pending" [disabled]="isSaving">
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Display Order</mat-label>
          <input matInput type="number" [(ngModel)]="data.displayOrder" placeholder="Ex: 1" [disabled]="isSaving">
        </mat-form-field>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end" class="p-24">
      <button mat-button (click)="close()" [disabled]="isSaving">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="!data.name || data.displayOrder == null || isSaving">
        {{ isSaving ? 'Saving...' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `
})
export class ApplicationStatusDialogComponent {
  isSaving = false;
  isEdit = false;

  constructor(
    public dialogRef: MatDialogRef<ApplicationStatusDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Partial<ApplicationStatus>,
    private service: ApplicationStatusService,
    private snackBar: MatSnackBar
  ) {
    this.isEdit = !!data.id;
  }

  save() {
    if (!this.data.name || this.data.displayOrder == null) return;
    this.isSaving = true;

    const request$ = this.isEdit 
      ? this.service.update(this.data.id!, this.data)
      : this.service.create(this.data as ApplicationStatus);

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
