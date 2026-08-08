import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TablerIconsModule } from 'angular-tabler-icons';

import { ClientManagementService, Invitation } from '../../../services/client-management.service';
import { InviteDialogComponent } from '../invite-dialog/invite-dialog.component';

@Component({
  selector: 'app-invitations-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
    TablerIconsModule
  ],
  templateUrl: './invitations-list.component.html'
})
export class InvitationsListComponent implements OnInit {
  displayedColumns: string[] = ['email', 'phone', 'status', 'created', 'expires', 'actions'];
  invitations: Invitation[] = [];
  
  totalRecords = 0;
  pageSize = 10;
  currentPage = 1;

  isLoading = true;
  errorMessage = '';

  constructor(
    private clientService: ClientManagementService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadInvitations();
  }

  loadInvitations() {
    this.isLoading = true;
    this.errorMessage = '';
    this.clientService.listInvitations(this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.invitations = res.data.records || [];
          this.totalRecords = res.data.totalRecords || 0;
        } else {
          this.errorMessage = res.message || 'Failed to load invitations.';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'An error occurred while loading invitations.';
        this.isLoading = false;
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadInvitations();
  }

  openInviteDialog() {
    const dialogRef = this.dialog.open(InviteDialogComponent, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInvitations();
      }
    });
  }

  cancelInvitation(id: number) {
    if (confirm('Are you sure you want to cancel this invitation?')) {
      this.clientService.cancelInvitation(id).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadInvitations();
          } else {
            alert(res.message);
          }
        },
        error: () => alert('Failed to cancel invitation')
      });
    }
  }
}
