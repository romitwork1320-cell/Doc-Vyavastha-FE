import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TenantService } from 'src/app/services/tenant.service'; // Adjust path

@Component({
  selector: 'app-create-tenant-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatInputModule, 
    MatFormFieldModule, 
    FormsModule, 
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>Provision New Tenant</h2>
    <mat-dialog-content>
      <div class="d-flex flex-column gap-2" style="min-width: 350px;">
        <p class="text-muted f-s-14">
            This will provision a new database, restore the template, and register the tenant.
        </p>
        
        <mat-form-field appearance="outline" class="w-100 mt-2">
          <mat-label>Company Name</mat-label>
          <input matInput [(ngModel)]="companyName" placeholder="Ex: Example Tech" [disabled]="isCreating">
          <mat-hint>This will be the display name.</mat-hint>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="w-100">
            <mat-label>Contact Phone (Optional)</mat-label>
            <input matInput [(ngModel)]="contactPhone" placeholder="Ex: 9876543210" [disabled]="isCreating">
        </mat-form-field>

        <div *ngIf="isCreating" class="d-flex align-items-center gap-3 p-16 bg-light-primary rounded mt-2">
          <mat-spinner diameter="24"></mat-spinner>
          <div class="d-flex flex-column">
              <span class="f-w-600 text-primary">Provisioning Database...</span>
              <span class="f-s-12 text-muted">Please wait, this may take a moment.</span>
          </div>
        </div>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end" class="p-24">
      <button mat-button (click)="close()" [disabled]="isCreating">Cancel</button>
      <button mat-flat-button color="primary" (click)="create()" [disabled]="!companyName || isCreating">
        Create Tenant
      </button>
    </mat-dialog-actions>
  `
})
export class CreateTenantDialogComponent {
  companyName: string = '';
  contactPhone: string = '';
  isCreating = false;

  constructor(
    private dialogRef: MatDialogRef<CreateTenantDialogComponent>,
    private tenantService: TenantService,
    private snackBar: MatSnackBar
  ) {}

  create() {
    if(!this.companyName) return;

    this.isCreating = true;
    const dto = { 
        companyName: this.companyName,
        contactPhone: this.contactPhone 
    };

    this.tenantService.createTenant(dto).subscribe({
      next: (res) => {
        if(res.success) {
          this.snackBar.open('Tenant created successfully!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
          this.dialogRef.close(true); // Return true to trigger refresh in parent
        } else {
          this.snackBar.open(res.message || 'Failed to create tenant', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          this.isCreating = false;
        }
      },
      error: (err) => {
        const errorMsg = err.error?.message || err.message || 'Unknown error';
        this.snackBar.open(`Error: ${errorMsg}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        this.isCreating = false;
      }
    });
  }

  close() {
    this.dialogRef.close(false);
  }
}