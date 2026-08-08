import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Organization } from '../../../services/super-admin.service';
import { environment } from '../../../environments/environments';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-kyc-review-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatTabsModule, MatInputModule, MatFormFieldModule, FormsModule],
  templateUrl: './kyc-review-dialog.component.html'
})
export class KycReviewDialogComponent {
  rejectionReason: string = '';
  showRejectionInput: boolean = false;
  certUrl: SafeResourceUrl;
  panUrl: SafeResourceUrl;

  constructor(
    public dialogRef: MatDialogRef<KycReviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { organization: Organization },
    private sanitizer: DomSanitizer,
    private authService: AuthService
  ) {
    const token = this.authService.getAccessToken() || '';
    const certRawUrl = `${environment.apiUrl}/kyc/document/${data.organization.TenantID || (data.organization as any).tenant_id}/certificate?access_token=${token}&_t=${new Date().getTime()}`;
    const panRawUrl = `${environment.apiUrl}/kyc/document/${data.organization.TenantID || (data.organization as any).tenant_id}/pan?access_token=${token}&_t=${new Date().getTime()}`;

    // We use bypassSecurityTrustResourceUrl to allow iframe embedding safely
    this.certUrl = this.sanitizer.bypassSecurityTrustResourceUrl(certRawUrl);
    this.panUrl = this.sanitizer.bypassSecurityTrustResourceUrl(panRawUrl);
  }

  onApprove() {
    this.dialogRef.close({ action: 'approve' });
  }

  onReject() {
    if (this.showRejectionInput && this.rejectionReason.trim()) {
      this.dialogRef.close({ action: 'reject', reason: this.rejectionReason });
    } else {
      this.showRejectionInput = true;
    }
  }

  cancelReject() {
    this.showRejectionInput = false;
    this.rejectionReason = '';
  }
}

