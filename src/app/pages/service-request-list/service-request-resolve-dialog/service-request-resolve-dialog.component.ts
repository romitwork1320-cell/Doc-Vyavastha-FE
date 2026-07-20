import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ServiceRequest } from 'src/app/services/service-request.service';

@Component({
  selector: 'app-service-request-resolve-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule, TablerIconsModule],
  templateUrl: './service-request-resolve-dialog.component.html',
  styleUrls: ['./service-request-resolve-dialog.component.scss']
})
export class ServiceRequestResolveDialogComponent {
  remarks: string = '';

  constructor(
    public dialogRef: MatDialogRef<ServiceRequestResolveDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ServiceRequest
  ) {}

  onCancel(): void { this.dialogRef.close(null); }

  onConfirm(): void {
    this.dialogRef.close({ confirmed: true, remarks: this.remarks });
  }
}