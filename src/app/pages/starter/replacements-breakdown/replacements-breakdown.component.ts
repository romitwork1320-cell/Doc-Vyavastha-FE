import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexLegend,
  ApexTooltip,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { MaterialModule } from 'src/app/material.module';
import { DashboardService } from 'src/app/services/dashboard.service';

export interface BreakDownChartOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
}

@Component({
  selector: 'app-replacements-breakdown',
  standalone: true,
  imports: [NgApexchartsModule, MaterialModule, CommonModule],
  templateUrl: './replacements-breakdown.component.html', 
  styleUrls: ['./replacements-breakdown.component.scss'],
})
export class AppReplacementsBreakdownComponent implements OnInit {
  @ViewChild('chart') chart: ChartComponent = Object.create(null);
  public chartOptions: Partial<BreakDownChartOptions> | any;

  constructor(private dashboardService: DashboardService) {
    this.initChart([0, 0, 0, 0]);
  }

  ngOnInit(): void {
    this.dashboardService.getStatusCounts().subscribe((response) => {
      if (response.success && response.data) {
        const pending = response.data.find(d => d.groupStatus === 'Pending')?.totalCount || 0;
        const inProgress = response.data.find(d => d.groupStatus === 'In Progress')?.totalCount || 0;
        const ready = response.data.find(d => d.groupStatus === 'Ready')?.totalCount || 0;
        const completed = response.data.find(d => d.groupStatus === 'Completed')?.totalCount || 0;

        this.chartOptions.series = [pending, inProgress, ready, completed];
      }
    });
  }

  initChart(data: number[]) {
    this.chartOptions = {
      series: data,
      labels: ['Pending', 'In Progress', 'Ready', 'Completed'],
      chart: {
        type: 'donut',
        height: 300,
        fontFamily: "'Plus Jakarta Sans', sans-serif;",
        toolbar: { show: false }, // Generally cleaner to hide toolbar on donuts
      },
      // Theme Colors: Pending(Orange), InProgress(Purple), Ready(Cyan), Completed(Green)
      colors: ['#f8c20a', '#635bff', '#16cdc7', '#36c76c'],
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                color: '#777',
                // Optional: formatter function can go here if needed
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      legend: {
        show: true,
        position: 'bottom',
        markers: { width: 10, height: 10 },
        itemMargin: { horizontal: 10, vertical: 5 } // Add spacing for touch targets
      },
      tooltip: {
        theme: 'dark',
        fillSeriesColor: false,
      },
    };
  }
}