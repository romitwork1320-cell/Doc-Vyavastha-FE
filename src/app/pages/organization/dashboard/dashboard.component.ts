import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TablerIconsModule } from 'angular-tabler-icons';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NgApexchartsModule } from 'ng-apexcharts';

import { AuthService } from '../../../services/auth.service';
import { DashboardService, DashboardData } from '../../../services/dashboard.service';
import { KycService, KycStatusResponse } from '../../../services/kyc.service';
import { KycModalComponent } from '../../erp-dashboard/kyc-modal/kyc-modal.component';

@Component({
  selector: 'app-organization-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    TablerIconsModule,
    RouterModule,
    NgApexchartsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class OrganizationDashboardComponent implements OnInit, OnDestroy {
  isLoading = true;
  private destroy$ = new Subject<void>();
  dashboardData: DashboardData | null = null;
  errorMessage: string | null = null;
  kycStatus: KycStatusResponse | null = null;

  // Chart configs
  public statusChartOptions: any;

  constructor(
    private dashboardService: DashboardService,
    public authService: AuthService,
    private kycService: KycService,
    private dialog: MatDialog
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

    this.kycService.getStatus().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.kycStatus = res.data;
        }
      }
    });

    this.dashboardService.getDashboard().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.dashboardData = res.data;
          this.initCharts();
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

  initCharts() {
    const statuses = this.dashboardData?.applicationsByStatus || [];
    
    let labels: string[] = [];
    let series: number[] = [];
    
    if (statuses.length === 0) {
      labels = ['No Data'];
      series = [1];
    } else {
      labels = statuses.map((s: any) => s.status);
      series = statuses.map((s: any) => s.count);
    }

    this.statusChartOptions = {
      series: [
        {
          name: 'Applications',
          data: series
        }
      ],
      chart: {
        type: 'bar',
        height: 300,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        toolbar: { show: false }
      },
      colors: ['#5d87ff', '#13deb9', '#ffae1f', '#fa896b', '#49beff'],
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: true,
          distributed: true,
          barHeight: '60%'
        }
      },
      dataLabels: {
        enabled: true,
        style: { colors: ['#fff'] }
      },
      xaxis: {
        categories: labels,
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#64748b',
            fontSize: '13px',
            fontWeight: 600
          }
        }
      },
      legend: { show: false },
      grid: { show: false }
    };
  }

  openKycModal() {
    const dialogRef = this.dialog.open(KycModalComponent, {
      width: '500px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDashboardData();
      }
    });
  }
}
