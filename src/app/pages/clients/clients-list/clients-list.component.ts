import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';

import { ClientManagementService, Connection } from '../../../services/client-management.service';
import { PermissionsDialogComponent } from '../permissions-dialog/permissions-dialog.component';
import { ClientFormDialogComponent } from '../client-form-dialog/client-form-dialog.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatMenuModule,
    MatDialogModule,
    MatCheckboxModule,
    MatTooltipModule,
    FormsModule,
    TablerIconsModule
  ],
  templateUrl: './clients-list.component.html'
})
export class ClientsListComponent implements OnInit {
  displayedColumns: string[] = ['select', 'photo', 'name', 'clientId', 'status', 'actions'];
  connections: Connection[] = [];
  
  totalRecords = 0;
  pageSize = 10;
  currentPage = 1;
  statusFilter = 'ACTIVE';
  searchQuery = '';

  isLoading = true;
  errorMessage = '';

  canAdd = false;
  canEdit = false;
  canDelete = false;

  constructor(
    private clientService: ClientManagementService,
    private dialog: MatDialog,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.canAdd = this.authService.hasPermission('/dashboard/clients', 'CanAdd');
    this.canEdit = this.authService.hasPermission('/dashboard/clients', 'CanEdit');
    this.canDelete = this.authService.hasPermission('/dashboard/clients', 'CanDelete');

    this.loadClients();
  }

  loadClients() {
    this.isLoading = true;
    this.errorMessage = '';
    this.clientService.listClients(this.currentPage, this.pageSize, this.statusFilter, this.searchQuery).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.connections = (res.data || []).map((item: any) => {
            let fullName = '';
            const firstName = item.firstName || item.FirstName || item.first_name;
            const lastName = item.lastName || item.LastName || item.last_name;
            
            if (firstName || lastName) {
                fullName = `${firstName || ''} ${lastName || ''}`.trim();
            } else {
                fullName = item.fullName || item.FullName;
            }

            return {
              id: item.id || item.ID,
              clientId: item.clientId || item.ClientID,
              tenantId: item.tenantId || item.TenantID,
              status: item.status || item.Status,
              client: {
                id: item.clientId || item.ClientID,
                userId: item.userId || item.UserID,
                fullName: fullName,
                connectionCode: item.connectionCode || item.ConnectionCode
              }
            };
          });
          this.totalRecords = res.totalRecords || 0;
        } else {
          this.errorMessage = res.message || 'Failed to load clients.';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'An error occurred while loading clients.';
        this.isLoading = false;
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadClients();
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadClients();
  }

  getStatusDisplay(): string {
    switch(this.statusFilter) {
      case 'ACTIVE': return 'Active';
      case 'IN_ACTIVE': return 'In Active';
      case 'BLOCKED': return 'Blocked';
      default: return 'All Status';
    }
  }

  setStatusFilter(status: string) {
    this.statusFilter = status;
    this.onFilterChange();
  }

  applySearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.onFilterChange();
  }

  openAddClientDialog() {
    const dialogRef = this.dialog.open(ClientFormDialogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadClients();
      }
    });
  }

  openPermissionsDialog(conn: Connection) {
    const dialogRef = this.dialog.open(PermissionsDialogComponent, {
      width: '400px',
      data: { connectionId: conn.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // optionally show a snackbar indicating success
      }
    });
  }

  removeConnection(conn: Connection) {
    if (confirm(`Are you sure you want to deactivate connection with ${conn.client?.fullName}?`)) {
      this.clientService.removeConnection(conn.id).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadClients();
          } else {
            alert(res.message);
          }
        },
        error: () => alert('Failed to deactivate connection')
      });
    }
  }

  activateConnection(conn: Connection) {
    if (confirm(`Are you sure you want to activate connection with ${conn.client?.fullName}?`)) {
      this.clientService.activateConnection(conn.id).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadClients();
          } else {
            alert(res.message);
          }
        },
        error: () => alert('Failed to activate connection')
      });
    }
  }
}
