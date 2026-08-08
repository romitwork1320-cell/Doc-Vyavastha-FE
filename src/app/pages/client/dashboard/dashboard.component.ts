import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TablerIconsModule } from 'angular-tabler-icons';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../../services/auth.service';
import { DashboardService, DashboardData } from '../../../services/dashboard.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    TablerIconsModule,
    RouterModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ClientDashboardComponent implements OnInit, OnDestroy {
  isLoading = true;
  private destroy$ = new Subject<void>();
  dashboardData: DashboardData | null = null;
  errorMessage: string | null = null;

  constructor(
    private dashboardService: DashboardService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData() {
    this.isLoading = true;
    this.errorMessage = null;

    this.dashboardService.getDashboard().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.dashboardData = res.data;
        } else {
          this.errorMessage = res.message || 'Failed to load dashboard data.';
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || 'Failed to load dashboard data.';
        this.isLoading = false;
      }
    });
  }
}
