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
  selector: 'app-requirement-create-dialog',
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
  templateUrl: './requirement-create-dialog.component.html',
  styleUrls: ['./requirement-create-dialog.component.scss']
})
export class RequirementCreateDialogComponent implements OnInit {
  reqForm!: FormGroup;
  isLoading = false;

  constructor(
    public dialogRef: MatDialogRef<RequirementCreateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private fb: FormBuilder,
    private applicationService: ApplicationService
  ) {}

  ngOnInit(): void {
    this.reqForm = this.fb.group({
      document_name: ['', Validators.required],
      description: ['']
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.reqForm.invalid) return;

    this.isLoading = true;
    const payload = this.reqForm.value;

    this.applicationService.addRequirement(this.data.id, payload).subscribe({
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
