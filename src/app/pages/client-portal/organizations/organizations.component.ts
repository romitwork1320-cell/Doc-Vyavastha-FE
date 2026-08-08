import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environments';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-client-organizations',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    TablerIconsModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './organizations.component.html',
  styleUrls: []
})
export class ClientOrganizationsComponent implements OnInit, OnDestroy {
  organizations: any[] = [];
  isLoading = true;
  errorMessage = '';
  displayedColumns: string[] = ['tenantName', 'createdAt', 'status', 'actions'];
  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadOrganizations();
  }

  loadOrganizations() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.http.get<any>(`${environment.apiUrl}/client/organizations`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.organizations = (res.data || []).map((org: any) => ({
            id: org.id || org.ID,
            tenantId: org.tenantId || org.TenantID,
            tenantName: org.tenantName || org.TenantName,
            createdAt: org.createdAt || org.CreatedAt,
            status: org.status || org.Status || 'ACTIVE'
          }));
        } else {
          this.errorMessage = res.message || 'Failed to load organizations';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'An error occurred';
        this.isLoading = false;
      }
    });
  }

  toggleBlockStatus(org: any) {
    const newStatus = org.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    
    this.http.put<any>(`${environment.apiUrl}/client/connections/${org.id}/status`, { status: newStatus }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open(`Organization ${newStatus === 'BLOCKED' ? 'blocked' : 'unblocked'} successfully.`, 'Close', { duration: 3000 });
          org.status = newStatus;
        } else {
          this.snackBar.open(res.message || 'Failed to update status', 'Close', { duration: 3000 });
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to update status', 'Close', { duration: 3000 });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
