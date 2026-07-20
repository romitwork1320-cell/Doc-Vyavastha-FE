import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; 
import { TablerIconsModule } from 'angular-tabler-icons'; 

import { SupportService, CreateTicketDto } from 'src/app/services/support.service';
import { AuthService } from 'src/app/services/auth.service';
import { TenantService } from 'src/app/services/tenant.service';
import { PaginationRequestDto } from 'src/app/common/interfaces/common';

@Component({
  selector: 'app-support-create-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule, 
    TablerIconsModule        
  ],
  templateUrl: './support-create-dialog.component.html',
  styleUrls: ['./support-create-dialog.component.scss'] 
})
export class SupportCreateDialogComponent {
  form: FormGroup;
  isSubmitting = false;
  isSystemAdmin = false;
  tenants: any[] = [];

  categories = ['Technical Issue', 'Feature Request', 'Billing', 'General Inquiry'];
  priorities = ['Low', 'Medium', 'High', 'Critical'];

  constructor(
    private fb: FormBuilder,
    private supportService: SupportService,
    private dialogRef: MatDialogRef<SupportCreateDialogComponent>,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private tenantService: TenantService // Inject TenantService
  ) {
    this.isSystemAdmin = this.authService.getUserRole() === 'SystemAdmin';

    this.form = this.fb.group({
      tenantId: [null], 
      subject: ['', Validators.required],
      category: ['Technical Issue', Validators.required],
      priority: ['Medium', Validators.required],
      description: ['', Validators.required]
    });

    // If Admin, make the Tenant dropdown mandatory
    if (this.isSystemAdmin) {
      this.form.get('tenantId')?.setValidators([Validators.required]);
    }
  }

  ngOnInit(): void {
    if (this.isSystemAdmin) {
      this.loadTenants();
    }
  }

  loadTenants() {
    const request: PaginationRequestDto = { pageIndex: 0, pageSize: 100, filter: '', sortColumn: 'companyName', sortDirection: 'asc' };
    this.tenantService.getTenants(request).subscribe(res => {
      if (res.success && res.data) {
        this.tenants = res.data.map((t: any) => ({ id: t.tenantId, name: t.companyName || t.tenantName }));
      }
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    
    const userId = this.authService.getUserId();
    
    const tenantId = this.isSystemAdmin 
        ? this.form.value.tenantId 
        : this.authService.getTenantId();

    if (!userId || !tenantId) {
       this.snackBar.open('Session invalid. Please login again.', 'Close', { duration: 3000 });
       this.isSubmitting = false;
       return;
    }

    const dto: CreateTicketDto = {
      subject: this.form.value.subject,
      category: this.form.value.category,
      priority: this.form.value.priority,
      description: this.form.value.description,
      tenantId: Number(tenantId),
      userId: Number(userId)
    };

    this.supportService.createTicket(dto).subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open('Ticket created successfully!', 'Close', { duration: 3000 });
          this.dialogRef.close(true); 
        } else {
          this.snackBar.open(res.message || 'Failed to create ticket', 'Close', { duration: 3000 });
        }
        this.isSubmitting = false;
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Error creating ticket', 'Close', { duration: 3000 });
        this.isSubmitting = false;
      }
    });
  }
}