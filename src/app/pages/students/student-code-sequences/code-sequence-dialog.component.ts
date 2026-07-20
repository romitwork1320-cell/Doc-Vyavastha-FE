import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StudentCodeSequenceService } from '../../../services/student-code-sequence.service';
import { StudentCodeConfigurationService } from '../../../services/student-code-configuration.service';
import { StudentCategoryService } from '../../../services/student-category.service';
import { StudentCodeSequence } from '../../../models/student.models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-code-sequence-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatInputModule, MatFormFieldModule, MatSelectModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Edit Code Sequence</h2>
    <mat-dialog-content>
      <div class="d-flex flex-column gap-2" style="min-width: 400px; margin-top: 8px;">
        
        <p class="text-muted m-b-16">
          <strong>Config:</strong> {{ data.configDetails || 'Unknown' }}
        </p>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Current Number</mat-label>
          <input matInput type="number" [(ngModel)]="data.currentNumber" placeholder="Ex: 12" [disabled]="isSaving">
          <mat-hint>Manually override the next generation number.</mat-hint>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Last Generated Code</mat-label>
          <input matInput [(ngModel)]="data.lastGeneratedCode" placeholder="Ex: COM-0012" [disabled]="true">
        </mat-form-field>

      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end" class="p-24">
      <button mat-button (click)="close()" [disabled]="isSaving">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="data.currentNumber == null || isSaving">
        {{ isSaving ? 'Saving...' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `
})
export class CodeSequenceDialogComponent {
  isSaving = false;

  constructor(
    public dialogRef: MatDialogRef<CodeSequenceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private service: StudentCodeSequenceService,
    private snackBar: MatSnackBar
  ) {
  }

  save() {
    if (this.data.currentNumber == null) return;
    this.isSaving = true;

    // We only ever edit sequences manually in exceptional cases
    const updatePayload: Partial<StudentCodeSequence> = {
      currentNumber: this.data.currentNumber
    };

    this.service.update(this.data.id!, updatePayload).subscribe({
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
