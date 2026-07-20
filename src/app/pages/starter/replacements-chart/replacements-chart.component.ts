import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexPlotOptions,
  ApexLegend,
  ApexStroke,
  ApexTooltip,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexYAxis,
  ApexGrid,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { MaterialModule } from 'src/app/material.module';
import { DashboardService } from 'src/app/services/dashboard.service';

export interface ChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  yaxis: ApexYAxis;
  xaxis: ApexXAxis;
  grid: ApexGrid;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  colors: string[];
}

@Component({
  selector: 'app-replacements-chart',
  standalone: true,
  imports: [NgApexchartsModule, MaterialModule, CommonModule],
  templateUrl: './replacements-chart.component.html', // <--- Updated
  styleUrls: ['./replacements-chart.component.scss'],   // <--- Updated
})
export class AppReplacementsChartComponent implements OnInit {
  @ViewChild('chart') chart: ChartComponent = Object.create(null);
  public chartOptions: Partial<ChartOptions> | any;

  constructor(private dashboardService: DashboardService) {
    // Initialize with empty/default data
    this.initChart([0, 0, 0, 0]); 
  }

  ngOnInit(): void {
    this.dashboardService.getStatusCounts().subscribe((response) => {
      if (response.success && response.data) {
        // Map API data to chart array [Pending, In Progress, Ready, Completed]
        const pending = response.data.find(d => d.groupStatus === 'Pending')?.totalCount || 0;
        const inProgress = response.data.find(d => d.groupStatus === 'In Progress')?.totalCount || 0;
        const ready = response.data.find(d => d.groupStatus === 'Ready')?.totalCount || 0;
        const completed = response.data.find(d => d.groupStatus === 'Completed')?.totalCount || 0;

        // Update Chart
        this.chartOptions.series = [{
          name: 'Replacements',
          data: [pending, inProgress, ready, completed],
        }];
      }
    });
  }

  initChart(data: number[]) {
    this.chartOptions = {
      series: [
        {
          name: 'Replacements',
          data: data,
        },
      ],
      chart: {
        type: 'bar',
        height: 350,
        fontFamily: "'Plus Jakarta Sans', sans-serif;",
        toolbar: { show: false },
      },
      // Theme Colors: Pending(Orange), InProgress(Purple), Ready(Cyan), Completed(Green)
      colors: ['#f8c20a', '#635bff', '#16cdc7', '#36c76c'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '42%',
          borderRadius: 5,
          distributed: true, // Required to have different colors per bar
        },
      },
      dataLabels: { enabled: false },
      stroke: {
        show: true,
        width: 0,
        colors: ['transparent'],
      },
      xaxis: {
        categories: ['Pending', 'In Progress', 'Ready', 'Completed'],
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        show: true,
      },
      grid: {
        strokeDashArray: 3,
        borderColor: 'rgba(0,0,0,0.1)',
      },
      tooltip: {
        theme: 'dark',
        x: { show: false }, 
      },
      legend: { show: false }, // Hide legend as x-axis labels serve that purpose
    };
  }
}