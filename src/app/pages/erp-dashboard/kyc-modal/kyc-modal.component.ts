import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { KycService } from '../../../services/kyc.service';
import { finalize } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MaterialModule } from 'src/app/material.module';

@Component({
  selector: 'app-kyc-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MaterialModule],
  templateUrl: './kyc-modal.component.html'
})
export class KycModalComponent {
  certificateFile: File | null = null;
  panFile: File | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(
    public dialogRef: MatDialogRef<KycModalComponent>,
    private kycService: KycService
  ) {}

  onFileSelected(event: any, type: 'certificate' | 'pan') {
    const file = event.target.files[0];
    if (file) {
      if (type === 'certificate') this.certificateFile = file;
      if (type === 'pan') this.panFile = file;
    }
  }

  submitKyc() {
    if (!this.certificateFile || !this.panFile) {
      this.errorMessage = 'Please upload both Certificate and PAN.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formData = new FormData();
    formData.append('certificate', this.certificateFile);
    formData.append('pan', this.panFile);

    this.kycService.uploadDocuments(formData).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.dialogRef.close(true);
        } else {
          this.errorMessage = res.message || 'Upload failed.';
        }
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || 'Upload failed.';
      }
    });
  }
}
