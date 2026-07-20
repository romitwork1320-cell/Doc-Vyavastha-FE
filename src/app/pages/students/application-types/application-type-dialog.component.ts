import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApplicationTypeService } from '../../../services/application-type.service';
import { ApplicationType } from '../../../models/student.models';

@Component({
  selector: 'app-application-type-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatInputModule, MatFormFieldModule, FormsModule],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit Application Type' : 'Create Application Type' }}</h2>
    <mat-dialog-content>
      <div class="d-flex flex-column gap-2" style="min-width: 350px; margin-top: 8px;">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Name</mat-label>
          <input matInput [(ngModel)]="data.name" placeholder="Ex: Admission" [disabled]="isSaving">
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Description</mat-label>
          <textarea matInput [(ngModel)]="data.description" placeholder="Description..." [disabled]="isSaving"></textarea>
        </mat-form-field>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end" class="p-24">
      <button mat-button (click)="close()" [disabled]="isSaving">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="!data.name || isSaving">
        {{ isSaving ? 'Saving...' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `
})
export class ApplicationTypeDialogComponent {
  isSaving = false;
  isEdit = false;

  constructor(
    public dialogRef: MatDialogRef<ApplicationTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Partial<ApplicationType>,
    private service: ApplicationTypeService,
    private snackBar: MatSnackBar
  ) {
    this.isEdit = !!data.id;
  }

  save() {
    if (!this.data.name) return;
    this.isSaving = true;

    const request$ = this.isEdit 
      ? this.service.update(this.data.id!, this.data)
      : this.service.create(this.data as ApplicationType);

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
