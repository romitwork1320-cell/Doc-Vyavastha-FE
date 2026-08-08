import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { KycService, KycStatusResponse } from '../../../services/kyc.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../environments/environments';
import { KycModalComponent } from '../kyc-modal/kyc-modal.component';
import { jwtDecode } from 'jwt-decode';

import { TablerIconsModule } from 'angular-tabler-icons';

@Component({
  selector: 'app-kyc-status',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTabsModule, TablerIconsModule],
  templateUrl: './kyc-status.component.html'
})
export class KycStatusComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  kycStatus: KycStatusResponse | null = null;
  certUrl: SafeResourceUrl | null = null;
  panUrl: SafeResourceUrl | null = null;

  constructor(
    private kycService: KycService,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadStatus();
  }

  loadStatus() {
    this.isLoading = true;
    this.kycService.getStatus().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.kycStatus = res.data;
          
          if (this.kycStatus?.status !== 'PENDING_SUBMISSION') {
            const token = this.authService.getAccessToken();
            if (token) {
              const decoded: any = jwtDecode(token);
              const tenantId = decoded.TenantId;
              
              const certRaw = `${environment.apiUrl}/kyc/document/${tenantId}/certificate?access_token=${token}`;
              const panRaw = `${environment.apiUrl}/kyc/document/${tenantId}/pan?access_token=${token}`;
              
              this.certUrl = this.sanitizer.bypassSecurityTrustResourceUrl(certRaw);
              this.panUrl = this.sanitizer.bypassSecurityTrustResourceUrl(panRaw);
            }
          }
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || 'Failed to load KYC status';
        this.isLoading = false;
      }
    });
  }

  openUploadModal() {
    const dialogRef = this.dialog.open(KycModalComponent, {
      width: '500px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadStatus();
      }
    });
  }
}
