import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { College } from '../../models/student.models';
import { CollegeService } from '../../services/college.service';

@Component({
  selector: 'app-college-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    TablerIconsModule
  ],
  templateUrl: './college-dialog.component.html',
  styleUrls: ['./college-dialog.component.scss']
})
export class CollegeDialogComponent {
  form: FormGroup;
  isEditMode: boolean;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CollegeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: College,
    private service: CollegeService,
    private snackBar: MatSnackBar
  ) {
    this.isEditMode = !!data?.id;
    
    this.form = this.fb.group({
      name: [data?.name || '', [Validators.required, Validators.maxLength(255)]]
    });
  }

  get f() { return this.form.controls; }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const reqData = this.form.value;

    const request$ = this.isEditMode
      ? this.service.update(this.data.id, reqData)
      : this.service.create(reqData);

    request$.subscribe({
      next: (res: any) => {
        if (res.success) {
          this.snackBar.open(
            `College ${this.isEditMode ? 'updated' : 'created'} successfully`,
            'OK',
            { duration: 3000 }
          );
          this.dialogRef.close(true);
        } else {
          this.snackBar.open(res.message || 'Operation failed', 'Close', { duration: 3000 });
          this.isSubmitting = false;
        }
      },
      error: (err: any) => {
        let msg = 'An error occurred';
        if (err.error?.message) {
          msg = err.error.message;
        }
        this.snackBar.open(msg, 'Close', { duration: 3000 });
        this.isSubmitting = false;
      }
    });
  }
}
