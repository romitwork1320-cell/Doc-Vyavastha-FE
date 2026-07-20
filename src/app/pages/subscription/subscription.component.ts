import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Plan, SubscriptionService, TenantSubscription } from 'src/app/services/subscription.service';
import { SubscriptionCheckoutDialogComponent } from './subscription-checkout-dialog/subscription-checkout-dialog.component';
import { jwtDecode } from 'jwt-decode';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatSelectModule, MatProgressBarModule, MatSnackBarModule,
    MatChipsModule, MatDividerModule, MatProgressSpinnerModule, MatDialogModule,
    TablerIconsModule
  ],
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.scss']
})
export class SubscriptionComponent implements OnInit {
  plans: Plan[] = [];
  currentSub: TenantSubscription | null = null;
  isLoading = false;
  currentTenantId: number = 0;

  constructor(
    private subService: SubscriptionService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private authService: AuthService
  ) {
    const token = this.authService.getAccessToken();
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.currentTenantId = Number(decodedToken.TenantId || decodedToken.tenantId || decodedToken.tid || 0);
    }
    if (!this.currentTenantId) {
      const tenantIdStr = localStorage.getItem('tenant_id');
      if (tenantIdStr) {
        this.currentTenantId = Number(tenantIdStr);
      } else {
        console.warn('⚠️ No "tenant_id" found in localStorage. Defaulting to 1.');
        this.currentTenantId = 1; 
      }
    }
  }

  ngOnInit(): void {
    if (this.currentTenantId > 0) {
        this.loadData();
    } else {
        this.snackBar.open('Error: Could not identify Tenant', 'Close');
    }
  }

  loadData() {
    this.isLoading = true;
    this.subService.getAllPlans().subscribe(res => {
      if(res.success) this.plans = res.data || [];
    });
    this.subService.getCurrentSubscription(this.currentTenantId).subscribe({
      next: (res) => {
        if(res.success) this.currentSub = res.data || null;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  // Helper Methods
  getDaysRemaining(): number {
    if (!this.currentSub) return 0;
    const end = new Date(this.currentSub.endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24));
  }

  getProgressValue(): number {
    if (!this.currentSub) return 0;
    const start = new Date(this.currentSub.startDate).getTime();
    const end = new Date(this.currentSub.endDate).getTime();
    return ((new Date().getTime() - start) / (end - start)) * 100;
  }

  selectPlan(plan: Plan) {
    // LOGIC: If 'currentSub' exists (even if expired), this is an Extension, not a new Trial.
    const isExtension = !!this.currentSub; 

    const dialogRef = this.dialog.open(SubscriptionCheckoutDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: {
        plan: plan,
        tenantId: this.currentTenantId,
        isExtension: isExtension 
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.snackBar.open(
            isExtension ? 'Trial Extended Successfully!' : 'Trial Activated Successfully!', 
            'Close', 
            { duration: 5000, panelClass: 'success-snack' }
        );
        this.loadData();
      }
    });
  }
}