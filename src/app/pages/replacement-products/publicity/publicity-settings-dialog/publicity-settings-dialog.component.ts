import { Component, Inject, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PublicityImage, PublicityImageUploadDto, PublicityService } from 'src/app/services/publicity.service';
import { AuthService } from 'src/app/services/auth.service';
import { EncryptionService } from 'src/app/services/encryption.service';
import { finalize } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';

// Define the data structure for the dialog
export interface DialogData {
  action: 'Add' | 'Delete';
  publicityImage: PublicityImage;
}

@Component({
  selector: 'app-publicity-settings-dialog',
  standalone: true,
  imports: [
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './publicity-settings-dialog.component.html',
  styleUrls: ['./publicity-settings-dialog.component.scss']
})
export class PublicitySettingsDialogComponent implements OnInit {
  private publicityService = inject(PublicityService);
  private snackBar = inject(MatSnackBar);
  
  action: string;
  local_data: PublicityImage;
  isSubmitting: boolean = false;
  selectedFile: File | null = null;
  
  constructor(
    private authService: AuthService,
    private encryptionService: EncryptionService,
    public dialogRef: MatDialogRef<PublicitySettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    // Make a copy of the data to avoid modifying the original object
    this.action = data.action;
    this.local_data = { ...data.publicityImage };
  }

  ngOnInit(): void {
    // This is optional, but ensures that local_data is always initialized correctly
    if (this.action === 'Add') {
      this.local_data = {
        id: 0,
        filePath: '',
        title: '',
        link: '',
        uploadedOn: ''
      };
    }
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    this.selectedFile = fileList && fileList.length > 0 ? fileList[0] : null;
  }

  doAction(action: string): void {
    this.isSubmitting = true;

    if (action === 'Add') {
      if (!this.selectedFile) {
        this.isSubmitting = false;
        return;
      }
      const imageDto: PublicityImageUploadDto = {
        file: this.selectedFile,
        title: this.local_data.title,
        link: this.local_data.link
      };
      this.publicityService.addPublicityImage(imageDto)
        .pipe(finalize(() => this.isSubmitting = false))
        .subscribe(response => {
          this.dialogRef.close({ event: 'Add', data: response.data, message: response.message });
        });
    } else if (action === 'Delete') {
      const tenantId = this.authService.getTenantId();
      if (!tenantId) {
        this.snackBar.open("Error: Tenant ID is missing. Please log in again.", 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        this.isSubmitting = false;
        return;
      }
      const encryptedTenantId = this.encryptionService.encrypt(tenantId.toString());
      this.publicityService.deletePublicityImage(this.local_data.id, encryptedTenantId)
        .pipe(finalize(() => this.isSubmitting = false))
        .subscribe(response => {
          this.dialogRef.close({ event: 'Delete', data: response.data, message: response.message });
        });
    }
  }

  closeDialog(): void {
    this.dialogRef.close({ event: 'Cancel' });
  }
}