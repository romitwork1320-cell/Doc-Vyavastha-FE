import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ApplicationService } from '../../../services/application.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApplicationCreateDialogComponent } from '../application-create-dialog/application-create-dialog.component';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../../services/auth.service';
import { ClientManagementService } from '../../../services/client-management.service';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-application-list',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatTableModule, 
    MatButtonModule, 
    TablerIconsModule,
    MatSnackBarModule,
    MatDialogModule,
    DatePipe,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatButtonToggleModule,
    MatDividerModule,
    MatPaginatorModule
  ],
  templateUrl: './application-list.component.html',
  styleUrl: './application-list.component.scss'
})
export class ApplicationListComponent implements OnInit {
  applications: any[] = [];
  filteredApplications: any[] = [];
  paginatedApplications: any[] = [];
  displayedColumns: string[] = ['title', 'status', 'created_at', 'actions'];
  currentFilter: string = 'All';
  clientsMap: { [key: number]: string } = {};

  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;

  constructor(
    private applicationService: ApplicationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private clientService: ClientManagementService
  ) {}

  canAdd = false;
  canEdit = false;
  canDelete = false;

  get isOrganization(): boolean {
    return this.authService.isOrganization();
  }

  ngOnInit(): void {
    this.canAdd = this.authService.hasPermission('/dashboard/applications', 'CanAdd');
    this.canEdit = this.authService.hasPermission('/dashboard/applications', 'CanEdit');
    this.canDelete = this.authService.hasPermission('/dashboard/applications', 'CanDelete');

    if (this.isOrganization) {
      this.displayedColumns = ['title', 'client', 'status', 'created_at', 'actions'];
      this.loadClients();
    } else {
      this.displayedColumns = ['title', 'status', 'created_at', 'actions'];
    }

    this.route.queryParams.subscribe(params => {
      if (params['status']) {
        this.currentFilter = params['status'];
        if (this.applications.length > 0) {
          this.applyFilter(this.currentFilter);
        }
      }
    });

    this.loadApplications();
  }

  loadClients() {
    this.clientService.listClients(1, 1000).subscribe({
      next: (res: any) => {
        if (res.data) {
          console.log("Client connections from backend:", res.data);
          res.data.forEach((conn: any) => {
            const clientId = conn.clientId || conn.ClientID || conn.client_id;
            // The frontend might also have nested conn.client if it was transformed, check that too
            const finalClientId = clientId || (conn.client && conn.client.id);
            let fullName = '';
            const firstName = conn.firstName || conn.FirstName || conn.first_name || (conn.client && conn.client.firstName);
            const lastName = conn.lastName || conn.LastName || conn.last_name || (conn.client && conn.client.lastName);
            
            if (firstName || lastName) {
                fullName = `${firstName || ''} ${lastName || ''}`.trim();
            } else {
                fullName = conn.fullName || conn.FullName || conn.full_name || (conn.client && conn.client.fullName);
            }
            
            const connCode = conn.connectionCode || conn.ConnectionCode || conn.connection_code || (conn.client && conn.client.connectionCode);
            
            if (finalClientId) {
              this.clientsMap[finalClientId] = fullName || `Client ID: ${connCode}`;
            }
          });
          console.log("Mapped clientsMap:", this.clientsMap);
        }
      }
    });
  }

  loadApplications() {
    this.applicationService.getApplications().subscribe({
      next: (res: any) => {
        this.applications = res.data || [];
        this.applyFilter(this.currentFilter);
      },
      error: (err) => {
        this.snackBar.open('Failed to load applications', 'Close', { duration: 3000 });
      }
    });
  }

  searchQuery: string = '';

  applyFilter(filter: string) {
    this.currentFilter = filter;
    this.filterData();
  }

  applySearch(event: any) {
    this.searchQuery = event.target.value?.toLowerCase() || '';
    this.filterData();
  }

  filterData() {
    let filtered = this.applications;

    if (this.currentFilter !== 'All') {
      if (this.currentFilter === 'ARCHIVED') {
        filtered = filtered.filter(app => !!(app.ArchivedAt || app.archived_at));
      } else {
        // Exclude archived from active views
        filtered = filtered.filter(app => {
          const status = (app.Status || app.status)?.toUpperCase();
          const isArchived = !!(app.ArchivedAt || app.archived_at);
          return !isArchived && status === this.currentFilter;
        });
      }
    }

    if (this.searchQuery) {
      filtered = filtered.filter(app => 
        (app.Title || app.title || '').toLowerCase().includes(this.searchQuery) ||
        (app.ClientID || app.client_id || '').toString().toLowerCase().includes(this.searchQuery)
      );
    }

    this.filteredApplications = filtered;
    
    // Reset to first page when filtering
    this.currentPage = 1;
    this.updatePagination();
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.updatePagination();
  }

  updatePagination() {
    this.totalRecords = this.filteredApplications.length;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedApplications = this.filteredApplications.slice(startIndex, startIndex + this.pageSize);
  }

  getFilterDisplay(): string {
    if (this.currentFilter === 'All') return 'All Status';
    if (this.currentFilter === 'IN_PROGRESS') return 'In Progress';
    return this.currentFilter.charAt(0).toUpperCase() + this.currentFilter.slice(1).toLowerCase();
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(ApplicationCreateDialogComponent, {
      width: '600px',
      maxWidth: '90vw'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadApplications();
      }
    });
  }



  generateLink(app: any) {
    app.generatingLink = true;
    
    // We assume the user has a selected workspace/tenant we can get from local storage
    const tenantId = parseInt(localStorage.getItem('tenant_id') || sessionStorage.getItem('tenant_id') || '0', 10);
    
    this.applicationService.generateMagicLink(app.ID || app.id, tenantId, app.ClientID || app.client_id).subscribe({
      next: (res) => {
        app.generatingLink = false;
        const link = `${window.location.origin}/secure-upload/${res.data?.token || res.token}`;
        navigator.clipboard.writeText(link).then(() => {
          this.snackBar.open('Magic link copied to clipboard!', 'Close', { duration: 3000 });
        });
      },
      error: (err) => {
        app.generatingLink = false;
        this.snackBar.open('Failed to generate link', 'Close', { duration: 3000 });
        console.error(err);
      }
    });
  }

  viewDetails(app: any) {
    const queryParams: any = {};
    if (app.tenantId || app.TenantID) {
      queryParams.tenantId = app.tenantId || app.TenantID;
    }
    this.router.navigate(['/dashboard/applications', app.id || app.ID], { queryParams });
  }

  archiveApplication(app: any, event: Event) {
    event.stopPropagation();
    const id = app.ID || app.id;
    this.applicationService.archiveApplication(id).subscribe({
      next: () => {
        this.snackBar.open('Application archived', 'Close', { duration: 3000 });
        this.loadApplications();
      },
      error: (err) => {
        this.snackBar.open('Failed to archive', 'Close', { duration: 3000 });
      }
    });
  }
}
