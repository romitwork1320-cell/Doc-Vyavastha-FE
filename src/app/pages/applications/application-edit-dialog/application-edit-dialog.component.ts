import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApplicationService } from '../../../services/application.service';

@Component({
  selector: 'app-application-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './application-edit-dialog.component.html',
  styleUrls: ['./application-edit-dialog.component.scss']
})
export class ApplicationEditDialogComponent implements OnInit {
  editForm!: FormGroup;
  isLoading = false;

  constructor(
    public dialogRef: MatDialogRef<ApplicationEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id: number; title: string },
    private fb: FormBuilder,
    private applicationService: ApplicationService
  ) {}

  ngOnInit(): void {
    this.editForm = this.fb.group({
      title: [this.data.title, Validators.required]
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.editForm.invalid) return;

    this.isLoading = true;
    const payload = this.editForm.value;

    this.applicationService.updateApplication(this.data.id, payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error(err);
      }
    });
  }
}
