import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { ClientManagementService } from '../../../services/client-management.service';

@Component({
  selector: 'app-invite-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  templateUrl: './invite-dialog.component.html'
})
export class InviteDialogComponent {
  email = '';
  phone = '';
  isSending = false;
  error = '';

  constructor(
    public dialogRef: MatDialogRef<InviteDialogComponent>,
    private clientService: ClientManagementService
  ) {}

  sendInvite() {
    if (!this.email && !this.phone) {
      this.error = 'Please provide an email or phone number.';
      return;
    }
    
    this.isSending = true;
    this.error = '';

    this.clientService.inviteClient(this.email, this.phone).subscribe({
      next: (res) => {
        if (res.success) {
          this.dialogRef.close(true);
        } else {
          this.error = res.message || 'Failed to send invitation.';
          this.isSending = false;
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Error sending invitation.';
        this.isSending = false;
      }
    });
  }
}
