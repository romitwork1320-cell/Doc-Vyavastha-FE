import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environments';

export interface ClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

@Component({
  selector: 'app-client-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './client-form-dialog.component.html'
})
export class ClientFormDialogComponent {
  clientForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public dialogRef: MatDialogRef<ClientFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.clientForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.clientForm.invalid) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload = this.clientForm.value;

    this.http.post<any>(`${environment.apiUrl}/clients`, payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.success) {
          this.dialogRef.close(true);
        } else {
          this.errorMessage = res.message || 'Failed to create client.';
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'An error occurred while creating client.';
      }
    });
  }
}
