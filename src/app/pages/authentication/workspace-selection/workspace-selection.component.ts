import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, TenantSelection } from 'src/app/services/auth.service';
import { MaterialModule } from 'src/app/material.module'; // Adjust path if needed

@Component({
  selector: 'app-workspace-selection',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule],
  templateUrl: './workspace-selection.component.html',
  styleUrls: ['./workspace-selection.component.scss']
})
export class WorkspaceSelectionComponent implements OnInit {
  tenants: TenantSelection[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private router: Router, private authService: AuthService) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { tenants: TenantSelection[] };
    
    if (state?.tenants) {
      this.tenants = state.tenants;
    } else {
      // If state is lost (refresh), redirect to login
      this.router.navigate(['/login']);
    }
  }

  ngOnInit(): void {}

  selectWorkspace(tenant: TenantSelection): void {
    if (!tenant.isActive) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.selectTenant(tenant.tenantId).subscribe({
      next: () => {
        this.isLoading = false;
        this.authService.navigateBasedOnRole();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Could not access the selected workspace.';
      }
    });
  }
}