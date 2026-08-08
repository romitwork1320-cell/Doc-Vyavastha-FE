import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environments';
import { DocumentVaultService, VaultFile } from '../../../services/document-vault.service';

@Component({
  selector: 'app-document-access-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    FormsModule
  ],
  templateUrl: './document-access-dialog.component.html',
  styleUrls: ['./document-access-dialog.component.scss']
})
export class DocumentAccessDialogComponent implements OnInit {
  document: VaultFile;
  organizations: any[] = [];
  loading = true;

  constructor(
    public dialogRef: MatDialogRef<DocumentAccessDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private vaultService: DocumentVaultService
  ) {
    this.document = data.document;
  }

  ngOnInit(): void {
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    this.http.get<any>(`${environment.apiUrl}/client/organizations`).subscribe({
      next: (res) => {
        const orgs = res.data || [];
        // Map organizations and check if there's a grant for this doc
        this.organizations = orgs.map((org: any) => {
          const hasAccess = this.document.grants?.some((g: any) => g.connection_id === org.ID || g.ConnectionID === org.ID);
          return {
            ...org,
            hasAccess: !!hasAccess
          };
        });
        this.loading = false;
      },
      error: (err) => {
        this.snackBar.open('Failed to load organizations', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  toggleAccess(org: any, event: any): void {
    const action = event.checked ? 'ENABLE' : 'DISABLE';
    const payload = {
      tenantId: org.TenantID || org.tenant_id,
      action: action
    };

    const docId = this.document.id;
    
    this.vaultService.updateGrant(docId, payload.tenantId, action as 'ENABLE'|'DISABLE').subscribe({
      next: () => {
        this.snackBar.open(`Access ${action === 'ENABLE' ? 'granted' : 'revoked'} for ${org.tenant_name || org.TenantName}`, 'Close', { duration: 3000 });
        org.hasAccess = event.checked;
      },
      error: (err) => {
        this.snackBar.open(`Failed to update access`, 'Close', { duration: 3000 });
        // Revert toggle on UI
        event.source.checked = !event.checked;
      }
    });
  }

  close(): void {
    this.dialogRef.close(true);
  }
}
