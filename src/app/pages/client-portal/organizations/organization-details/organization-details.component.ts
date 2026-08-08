import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { ApplicationService } from '../../../../services/application.service';
import { environment } from '../../../../environments/environments';
import { TablerIconsModule } from 'angular-tabler-icons';

@Component({
  selector: 'app-organization-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    TablerIconsModule
  ],
  templateUrl: './organization-details.component.html',
  styleUrls: ['./organization-details.component.scss']
})
export class OrganizationDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  tenantId: number;
  
  organization: any = null;
  applications = new MatTableDataSource<any>([]);
  
  isLoadingOrg = true;
  isLoadingApps = true;
  orgError = '';
  appError = '';

  displayedColumns: string[] = ['appNumber', 'title', 'status', 'createdAt', 'actions'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private applicationService: ApplicationService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.tenantId = +params['id'];
      if (this.tenantId) {
        this.loadData();
      } else {
        this.orgError = 'Invalid organization ID';
        this.isLoadingOrg = false;
        this.isLoadingApps = false;
      }
    });
  }

  loadData() {
    this.isLoadingOrg = true;
    this.isLoadingApps = true;

    // Load org details
    this.http.get<any>(`${environment.apiUrl}/client/organizations`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const orgs = res.data;
          // Find the specific organization
          const org = orgs.find((o: any) => (o.tenantId || o.TenantID) === this.tenantId);
          if (org) {
            this.organization = {
              tenantId: org.tenantId || org.TenantID,
              tenantName: org.tenantName || org.TenantName,
              createdAt: org.createdAt || org.CreatedAt,
              status: org.status || org.Status,
              contactEmail: org.contactEmail || org.ContactEmail,
              contactPhone: org.contactPhone || org.ContactPhone,
              addressLine1: org.addressLine1 || org.AddressLine1,
              addressLine2: org.addressLine2 || org.AddressLine2,
              city: org.city || org.City,
              state: org.state || org.State,
              country: org.country || org.Country,
              postalCode: org.postalCode || org.PostalCode
            };
          } else {
            this.orgError = 'Organization not found or access denied.';
          }
        } else {
          this.orgError = res.message || 'Failed to load organization';
        }
        this.isLoadingOrg = false;
      },
      error: (err) => {
        this.orgError = err.error?.message || 'Error loading organization';
        this.isLoadingOrg = false;
      }
    });

    // Load applications for this tenant
    // Note: getApplications accepts (clientId, tenantId). For current client, clientId can be undefined/null
    this.applicationService.getApplications(undefined, this.tenantId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.applications.data = res.data || [];
        setTimeout(() => {
          this.applications.paginator = this.paginator;
        });
        this.isLoadingApps = false;
      },
      error: (err: any) => {
        this.appError = err.error?.message || 'Error loading applications';
        this.isLoadingApps = false;
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.applications.filter = filterValue.trim().toLowerCase();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
