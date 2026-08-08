import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { ClientManagementService } from '../../../services/client-management.service';

@Component({
  selector: 'app-permissions-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    FormsModule
  ],
  templateUrl: './permissions-dialog.component.html'
})
export class PermissionsDialogComponent {
  permissions = {
    viewProfile: false,
    viewDocuments: false,
    uploadDocuments: false,
    createApplications: false,
    viewApplications: false,
    approveApplications: false,
    manageConnection: false
  };
  isSaving = false;
  error = '';

  constructor(
    public dialogRef: MatDialogRef<PermissionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { connectionId: number, currentPermissions?: any },
    private clientService: ClientManagementService
  ) {
    if (data.currentPermissions) {
      this.permissions = { ...this.permissions, ...data.currentPermissions };
    }
  }

  save() {
    this.isSaving = true;
    this.error = '';

    this.clientService.updatePermissions(this.data.connectionId, this.permissions).subscribe({
      next: (res) => {
        if (res.success) {
          this.dialogRef.close(true);
        } else {
          this.error = res.message || 'Failed to update permissions.';
          this.isSaving = false;
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Error updating permissions.';
        this.isSaving = false;
      }
    });
  }
}
