import { Component, OnInit, OnDestroy, ViewEncapsulation, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { TablerIconsModule } from 'angular-tabler-icons';
import { RouterModule } from '@angular/router';

import {
  AuthService
} from '../../services/auth.service';
import {
  ErpDashboardService,
  DashboardKpis,
  StudentAnalytics,
  ApplicationAnalytics,
  RevenueAnalytics,
  ActionItem,
  DeadlineItem,
  ActivityItem
} from '../../services/erp-dashboard.service';

import { AppRecentActivityComponent } from '../starter/recent-activity/recent-activity.component';

import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexStroke,
  ApexLegend,
  ApexPlotOptions,
  ApexNonAxisChartSeries,
  ApexResponsive
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis;
  dataLabels?: ApexDataLabels;
  plotOptions?: ApexPlotOptions;
  stroke?: ApexStroke;
  tooltip?: ApexTooltip;
  legend?: ApexLegend;
  labels?: string[];
  responsive?: ApexResponsive[];
  colors?: string[];
};

@Component({
  selector: 'app-erp-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    FormsModule,
    NgApexchartsModule,
    TablerIconsModule,
    AppRecentActivityComponent,
    RouterModule
  ],
  templateUrl: './erp-dashboard.component.html',
  styleUrls: ['./erp-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ErpDashboardComponent implements OnInit, OnDestroy {
  isLoading = true;
  private destroy$ = new Subject<void>();

  // Data
  kpis!: DashboardKpis;
  actionItems: ActionItem[] = [];
  deadlines: DeadlineItem[] = [];
  activities: ActivityItem[] = [];

  // Table columns
  deadlineColumns = ['studentCode', 'studentName', 'application', 'deadlineDate', 'remainingDays', 'action'];

  // Chart Options
  studentDistributionChart!: Partial<ChartOptions>;
  admissionTrendChart!: Partial<ChartOptions>;
  appStatusChart!: Partial<ChartOptions>;
  appTypesChart!: Partial<ChartOptions>;
  feeCollectionChart!: Partial<ChartOptions>;
  paymentMethodChart!: Partial<ChartOptions>;

  // Filters
  dateRange = '1 Month';

  constructor(private dashboardService: ErpDashboardService, public authService: AuthService) {}

  ngOnInit() {
    this.authService.activeBranchId$
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe(branchId => {
        if (branchId) {
          this.isLoading = true;
          this.loadDashboardData();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFilterChange() {
    this.isLoading = true;
    this.loadDashboardData();
  }

  loadDashboardData() {
    let fromDate: string | undefined;
    let toDate: string | undefined;

    const now = new Date();
    toDate = now.toISOString();

    if (this.dateRange === '1 Week') {
      const d = new Date(); d.setDate(d.getDate() - 7); fromDate = d.toISOString();
    } else if (this.dateRange === '1 Month') {
      const d = new Date(); d.setMonth(d.getMonth() - 1); fromDate = d.toISOString();
    } else if (this.dateRange === '3 Months') {
      const d = new Date(); d.setMonth(d.getMonth() - 3); fromDate = d.toISOString();
    } else if (this.dateRange === '6 Months') {
      const d = new Date(); d.setMonth(d.getMonth() - 6); fromDate = d.toISOString();
    } else if (this.dateRange === '1 Year') {
      const d = new Date(); d.setFullYear(d.getFullYear() - 1); fromDate = d.toISOString();
    }

    let loadedCount = 0;
    const checkComplete = () => {
      loadedCount++;
      if (loadedCount === 7) this.isLoading = false;
    };

    this.dashboardService.getKpis(fromDate, toDate).subscribe({ 
      next: res => { 
        if (res && res.success && res.data) this.kpis = res.data; 
        checkComplete(); 
      }, 
      error: () => checkComplete() 
    });
    
    this.dashboardService.getStudentAnalytics(fromDate, toDate).subscribe({ 
      next: res => {
        if (res && res.success && res.data) this.initStudentCharts(res.data);
        checkComplete();
      }, 
      error: () => checkComplete() 
    });

    this.dashboardService.getApplicationAnalytics(fromDate, toDate).subscribe({ 
      next: res => {
        if (res && res.success && res.data) this.initApplicationCharts(res.data);
        checkComplete();
      }, 
      error: () => checkComplete() 
    });

    this.dashboardService.getRevenueAnalytics(fromDate, toDate).subscribe({ 
      next: res => {
        if (res && res.success && res.data) this.initRevenueCharts(res.data);
        checkComplete();
      }, 
      error: () => checkComplete() 
    });

    this.dashboardService.getActionCenter(fromDate, toDate).subscribe({ 
      next: res => { 
        if (res && res.success && res.data) this.actionItems = res.data; 
        checkComplete(); 
      }, 
      error: () => checkComplete() 
    });
    
    this.dashboardService.getUpcomingDeadlines(fromDate, toDate).subscribe({ 
      next: res => { 
        if (res && res.success && res.data) this.deadlines = res.data; 
        checkComplete(); 
      }, 
      error: () => checkComplete() 
    });
    
    this.dashboardService.getRecentActivity(fromDate, toDate).subscribe({ 
      next: res => { 
        if (res && res.success && res.data) this.activities = res.data; 
        checkComplete(); 
      }, 
      error: () => checkComplete() 
    });
  }

  getPriorityColor(priority: string) {
    switch(priority) {
      case 'Critical': return '#ef4444'; // red-500
      case 'High': return '#f97316'; // orange-500
      case 'Medium': return '#eab308'; // yellow-500
      default: return '#3b82f6'; // blue-500
    }
  }

  getDeadlineColor(days: number) {
    if (days === 0) return 'text-red-500 font-bold';
    if (days <= 3) return 'text-orange-500 font-bold';
    return 'text-green-600 font-bold';
  }

  // --- Chart Initializers ---

  initStudentCharts(data: StudentAnalytics) {
    this.studentDistributionChart = {
      series: [{ name: 'Students', data: data.distributionByCategory.map(d => d.count) }],
      chart: { type: 'bar', height: 300, toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'top' } } },
      dataLabels: { enabled: true, offsetX: -6, style: { fontSize: '12px', colors: ['#fff'] } },
      xaxis: { categories: data.distributionByCategory.map(d => d.category) },
      colors: ['#6366f1']
    };

    this.admissionTrendChart = {
      series: [{ name: 'Registrations', data: data.admissionTrend.map(d => d.count) }],
      chart: { type: 'area', height: 300, toolbar: { show: false } },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      xaxis: { categories: data.admissionTrend.map(d => d.month) },
      colors: ['#10b981']
    };
  }

  initApplicationCharts(data: ApplicationAnalytics) {
    this.appStatusChart = {
      series: data.statusDistribution.map(d => d.count),
      labels: data.statusDistribution.map(d => d.status),
      chart: { type: 'donut', height: 300 },
      dataLabels: { enabled: false },
      legend: { position: 'bottom' },
      colors: ['#10b981', '#3b82f6', '#f59e0b', '#64748b', '#ef4444']
    };

    this.appTypesChart = {
      series: [{ name: 'Applications', data: data.typesDistribution.map(d => d.count) }],
      chart: { type: 'bar', height: 300, toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '45%' } },
      dataLabels: { enabled: false },
      xaxis: { categories: data.typesDistribution.map(d => d.type) },
      colors: ['#8b5cf6']
    };
  }

  initRevenueCharts(data: RevenueAnalytics) {
    this.feeCollectionChart = {
      series: [{ name: 'Revenue', data: data.collectionTrend.map(d => d.amount) }],
      chart: { type: 'area', height: 300, toolbar: { show: false } },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      xaxis: { categories: data.collectionTrend.map(d => d.month) },
      yaxis: { 
        labels: { 
          formatter: (val: number) => {
            if (val === 0) return '₹0';
            if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
            if (val >= 1000) return '₹' + (val / 1000).toFixed(1) + 'K';
            return '₹' + val.toString();
          } 
        } 
      },
      colors: ['#0ea5e9']
    };

    this.paymentMethodChart = {
      series: data.paymentMethodDistribution.map(d => d.amount),
      labels: data.paymentMethodDistribution.map(d => d.method),
      chart: { type: 'donut', height: 300 },
      dataLabels: { enabled: false },
      legend: { position: 'bottom' },
      colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#64748b']
    };
  }
}
