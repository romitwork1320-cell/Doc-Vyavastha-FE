import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TablerIconsModule } from 'angular-tabler-icons';
import { SuperAdminService, Organization } from '../../services/super-admin.service';
import { KycReviewDialogComponent } from './kyc-review-dialog/kyc-review-dialog.component';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, MatDialogModule, TablerIconsModule],
  templateUrl: './super-admin-dashboard.component.html'
})
export class SuperAdminDashboardComponent implements OnInit {
  organizations: Organization[] = [];
  dataSource = new MatTableDataSource<Organization>([]);
  displayedColumns: string[] = ['companyName', 'contactEmail', 'contactPhone', 'orgType', 'kycStatus', 'actions'];
  isLoading = true;
  errorMessage = '';


  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private superAdminService: SuperAdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadOrganizations();
  }

  applySearch(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  loadOrganizations() {
    this.isLoading = true;
    this.superAdminService.getOrganizations().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.organizations = res.data;
          this.dataSource = new MatTableDataSource(this.organizations);
          this.dataSource.paginator = this.paginator;
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || 'Failed to load organizations';
        this.isLoading = false;
      }
    });
  }

  reviewKyc(org: Organization) {
    const dialogRef = this.dialog.open(KycReviewDialogComponent, {
      width: '800px',
      data: { organization: org },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'approve') {
        this.superAdminService.approveOrganization(org.tenant_id || org.TenantID!).subscribe(() => this.loadOrganizations());
      } else if (result?.action === 'reject') {
        this.superAdminService.rejectOrganization(org.tenant_id || org.TenantID!, result.reason).subscribe(() => this.loadOrganizations());
      }
    });
  }

  getPendingKycCount(): number {
    return this.organizations.filter(o => o.KycStatus === 'PENDING_VERIFICATION').length;
  }

  getVerifiedKycCount(): number {
    return this.organizations.filter(o => o.KycStatus === 'VERIFIED').length;
  }
}
