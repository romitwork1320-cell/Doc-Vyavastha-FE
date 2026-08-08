import { Component, Inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApplicationService } from '../../../services/application.service';
import { TablerIconsModule } from 'angular-tabler-icons';

export interface ReviewDialogData {
  appId: number;
  reqId: number;
  documentName: string;
  description: string;
  versions: any[];
  currentStatus: string;
  isOrganization: boolean;
  tenantId?: number;
}

@Component({
  selector: 'app-requirement-review-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatIconModule, 
    MatFormFieldModule, 
    MatInputModule, 
    FormsModule,
    MatListModule,
    MatDividerModule,
    MatTooltipModule,
    DatePipe,
    TablerIconsModule
  ],
  templateUrl: './requirement-review-dialog.component.html',
  styleUrl: './requirement-review-dialog.component.scss'
})
export class RequirementReviewDialogComponent implements OnInit {
  isRejecting = false;
  rejectionReason = '';
  submitting = false;

  @ViewChild('accessRevokedTemplate') accessRevokedTemplate!: TemplateRef<any>;

  constructor(
    public dialogRef: MatDialogRef<RequirementReviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReviewDialogData,
    private applicationService: ApplicationService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    console.log('RequirementReviewDialog initialized with data:', this.data);
  }

  viewFile(version: any, file: any) {
    const tenantId = !this.data.isOrganization ? this.data.tenantId : undefined;
    this.applicationService.downloadVersionFile(this.data.appId, this.data.reqId, version.ID || version.id, file.ID || file.id, tenantId).subscribe({
      next: (blob: any) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (err: any) => {
        if (err.status === 403) {
          this.dialog.open(this.accessRevokedTemplate, { width: '450px', panelClass: 'rounded-dialog' });
        } else {
          console.error('Failed to view file', err);
          this.snackBar.open('Failed to load document.', 'Close', { duration: 3000 });
        }
      }
    });
  }

  downloadFile(version: any, file: any) {
    const tenantId = !this.data.isOrganization ? this.data.tenantId : undefined;
    this.applicationService.downloadVersionFile(this.data.appId, this.data.reqId, version.ID || version.id, file.ID || file.id, tenantId).subscribe({
      next: (blob: any) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.document_name || file.DocumentName || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      },
      error: (err: any) => {
        if (err.status === 403) {
          this.dialog.open(this.accessRevokedTemplate, { width: '450px', panelClass: 'rounded-dialog' });
        } else {
          console.error('Failed to download file', err);
          this.snackBar.open('Failed to download document.', 'Close', { duration: 3000 });
        }
      }
    });
  }

  approve() {
    this.submitReview('APPROVED');
  }

  reject() {
    this.isRejecting = true;
  }

  cancelReject() {
    this.isRejecting = false;
    this.rejectionReason = '';
  }

  confirmReject() {
    if (!this.rejectionReason.trim()) return;
    this.submitReview('REJECTED', this.rejectionReason);
  }

  private submitReview(status: string, reason?: string) {
    this.submitting = true;
    this.applicationService.reviewRequirement(this.data.appId, this.data.reqId, {
      status: status,
      reason: reason
    }).subscribe({
      next: (res: any) => {
        this.snackBar.open(`Document ${status.toLowerCase()} successfully`, 'Close', { duration: 3000 });
        this.dialogRef.close(true); // Return true to refresh
      },
      error: (err: any) => {
        console.error('Failed to review requirement', err);
        this.submitting = false;
      }
    });
  }
}
