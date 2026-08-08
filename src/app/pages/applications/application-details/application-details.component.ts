import { Component, OnInit } from '@angular/core';
import { combineLatest } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApplicationService } from '../../../services/application.service';
import { ClientManagementService, ClientProfile } from '../../../services/client-management.service';
import { AuthService } from '../../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ApplicationEditDialogComponent } from '../application-edit-dialog/application-edit-dialog.component';
import { RequirementCreateDialogComponent } from '../requirement-create-dialog/requirement-create-dialog.component';
import { RequirementReviewDialogComponent } from '../requirement-review-dialog/requirement-review-dialog.component';

@Component({
  selector: 'app-application-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatListModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTableModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule,
    TablerIconsModule,
    DatePipe
  ],
  templateUrl: './application-details.component.html',
  styleUrls: ['./application-details.component.scss']
})
export class ApplicationDetailsComponent implements OnInit {
  applicationId!: number;
  details: any = null;
  timeline: any[] = [];
  loading = true;

  dashboardStats = {
    total: 0,
    uploaded: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    completionPercentage: 0
  };

  clientProfile: ClientProfile | null = null;
  clientLoading = false;
  generatingLink = false;

  displayedColumns: string[] = ['documentName', 'status', 'latestVersion', 'uploadedBy', 'uploadedDate', 'reviewedBy', 'reviewedDate', 'actions'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private applicationService: ApplicationService,
    private clientService: ClientManagementService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private authService: AuthService
  ) {}

  get isOrganization(): boolean {
    return this.authService.isOrganization();
  }

  tenantId?: number;

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParams]).subscribe(([paramMap, queryParams]) => {
      if (queryParams['tenantId']) {
        this.tenantId = +queryParams['tenantId'];
      }
      const id = paramMap.get('id');
      if (id) {
        this.applicationId = +id;
        this.loadDetails();
        this.loadTimeline();
      }
    });
  }

  loadDetails(): void {
    this.applicationService.getApplicationDetails(this.applicationId, this.tenantId).subscribe({
      next: (res) => {
        this.details = res.data;
        this.calculateDashboard();
        this.loading = false;
        
        const clientId = this.details?.application?.ClientID || this.details?.application?.client_id;
        if (clientId && this.isOrganization) {
          this.loadClientProfile(clientId);
        }
      },
      error: (err) => {
        this.snackBar.open('Failed to load application details', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  loadTimeline(): void {
    this.applicationService.getTimeline(this.applicationId, this.tenantId).subscribe({
      next: (res) => {
        this.timeline = res.data;
      },
      error: (err) => console.error('Failed to load timeline', err)
    });
  }

  loadClientProfile(clientId: number): void {
    this.clientLoading = true;
    this.clientService.getClient(clientId).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          let fullName = '';
          const firstName = res.data.firstName || res.data.FirstName || res.data.first_name;
          const lastName = res.data.lastName || res.data.LastName || res.data.last_name;
          
          if (firstName || lastName) {
              fullName = `${firstName || ''} ${lastName || ''}`.trim();
          } else {
              fullName = res.data.fullName || res.data.FullName;
          }

          this.clientProfile = {
            ...res.data,
            fullName: fullName,
            connectionCode: res.data.connectionCode || res.data.ConnectionCode,
            email: res.data.email || res.data.Email,
            phone: res.data.phone || res.data.Phone,
          };
        }
        this.clientLoading = false;
      },
      error: (err: any) => {
        console.error('Failed to load client profile', err);
        this.clientLoading = false;
      }
    });
  }

  generateMagicLink(): void {
    if (!this.details || !this.details.application) return;
    const app = this.details.application;
    
    this.generatingLink = true;
    const tenantId = this.tenantId || parseInt(localStorage.getItem('tenant_id') || sessionStorage.getItem('tenant_id') || '0', 10);
    
    this.applicationService.generateMagicLink(app.ID || app.id, tenantId, app.ClientID || app.client_id).subscribe({
      next: (res: any) => {
        this.generatingLink = false;
        // Also update local details so the UI knows it has a token
        if (!this.details.application.MagicLinkToken && !this.details.application.magic_link_token) {
           this.details.application.MagicLinkToken = res.data?.token || res.token;
        }
        
        const link = `${window.location.origin}/secure-upload/${res.data?.token || res.token}`;
        navigator.clipboard.writeText(link).then(() => {
          this.snackBar.open('Magic link generated and copied to clipboard!', 'Close', { duration: 3000 });
        }).catch(() => {
          this.snackBar.open('Magic link generated but failed to copy. Token: ' + (res.data?.token || res.token), 'Close', { duration: 5000 });
        });
      },
      error: (err: any) => {
        this.generatingLink = false;
        this.snackBar.open('Failed to generate link', 'Close', { duration: 3000 });
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/applications']);
  }

  openEditDialog(): void {
    if (this.details?.application?.Status === 'COMPLETED') {
      this.snackBar.open('Cannot edit completed application.', 'Close', { duration: 3000 });
      return;
    }
    const dialogRef = this.dialog.open(ApplicationEditDialogComponent, {
      width: '500px',
      data: { id: this.applicationId, title: this.details.application.Title || this.details.application.title }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Application updated', 'Close', { duration: 3000 });
        this.loadDetails();
        this.loadTimeline();
      }
    });
  }

  openAddRequirementDialog(): void {
    if (this.details?.application?.Status === 'COMPLETED') {
      this.snackBar.open('Cannot add requirements to a completed application.', 'Close', { duration: 3000 });
      return;
    }
    const dialogRef = this.dialog.open(RequirementCreateDialogComponent, {
      width: '500px',
      data: { id: this.applicationId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Requirement added', 'Close', { duration: 3000 });
        this.loadDetails();
        this.loadTimeline();
      }
    });
  }



  downloadDeliverable(deliverable: any): void {
    const tenantId = !this.isOrganization ? this.tenantId : undefined;
    this.applicationService.downloadFinalDeliverable(this.applicationId, deliverable.id, tenantId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = deliverable.document_name || `Final_Deliverable_${deliverable.id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Failed to download final deliverable.', 'Close', { duration: 3000 });
      }
    });
  }

  // Phase 3 Additions

  calculateDashboard(): void {
    if (!this.details || !this.details.requirements) return;
    const reqs = this.details.requirements;
    this.dashboardStats.total = reqs.length;
    this.dashboardStats.uploaded = reqs.filter((r: any) => (r.status || r.Status) === 'UPLOADED').length;
    this.dashboardStats.approved = reqs.filter((r: any) => (r.status || r.Status) === 'APPROVED').length;
    this.dashboardStats.rejected = reqs.filter((r: any) => (r.status || r.Status) === 'REJECTED').length;
    this.dashboardStats.pending = reqs.filter((r: any) => (r.status || r.Status) === 'PENDING').length;
    
    // Only 'APPROVED' counts towards completion
    this.dashboardStats.completionPercentage = this.dashboardStats.total > 0 
      ? Math.round((this.dashboardStats.approved / this.dashboardStats.total) * 100) 
      : 0;
  }

  openReviewDialog(req: any): void {
    if (!req.versions || req.versions.length === 0) {
      this.snackBar.open('No versions to review yet.', 'Close', { duration: 3000 });
      return;
    }
    
    const dialogRef = this.dialog.open(RequirementReviewDialogComponent, {
      width: '600px',
      data: {
        appId: this.applicationId,
        reqId: req.id || req.ID,
        documentName: req.document_name || req.DocumentName,
        description: req.description || req.Description,
        versions: req.versions,
        currentStatus: req.status || req.Status,
        reviews: req.reviews || [],
        isOrganization: this.isOrganization,
        tenantId: this.tenantId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action) {
        this.snackBar.open(`Document marked as ${result.action}`, 'Close', { duration: 3000 });
        this.loadDetails(); // Automatically refresh UI
        this.loadTimeline();
      }
    });
  }

  updateApplicationStatus(newStatus: string): void {
    // Application Completion Validation
    if (newStatus === 'COMPLETED') {
      if (this.dashboardStats.approved < this.dashboardStats.total) {
        this.snackBar.open('Cannot mark as completed until all required documents are approved.', 'Close', { duration: 5000 });
        return;
      }
      if (!this.details.application.FinalDeliverableID && !this.details.application.final_deliverable_id) {
        this.snackBar.open('Cannot mark as completed until a Final Deliverable is uploaded.', 'Close', { duration: 5000 });
        return;
      }
    }

    this.applicationService.updateStatus(this.applicationId, newStatus).subscribe({
      next: () => {
        this.snackBar.open(`Status updated to ${newStatus}`, 'Close', { duration: 3000 });
        this.loadDetails();
        this.loadTimeline();
      },
      error: (err) => {
        this.snackBar.open('Failed to update status', 'Close', { duration: 3000 });
      }
    });
  }

  onDeliverableSelected(event: any): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;
    
    let completed = 0;
    const total = files.length;
    let hasError = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.applicationService.uploadFinalDeliverable(this.applicationId, file).subscribe({
        next: () => {
          completed++;
          if (completed === total) {
            this.snackBar.open(hasError ? 'Some deliverables uploaded successfully' : 'Final deliverables uploaded successfully', 'Close', { duration: 3000 });
            this.loadDetails();
            this.loadTimeline();
          }
        },
        error: (err) => {
          hasError = true;
          completed++;
          if (completed === total) {
            this.snackBar.open('Upload completed with some errors', 'Close', { duration: 3000 });
            this.loadDetails();
            this.loadTimeline();
          }
        }
      });
    }
    
    // Clear input so same files can be selected again if needed
    event.target.value = '';
  }

  getInitials(name: string): string {
    if (!name) return 'C';
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length === 0) return 'C';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
}
