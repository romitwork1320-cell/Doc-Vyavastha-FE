import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
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
  ApexFill
} from 'ng-apexcharts';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ReportService } from 'src/app/services/report.service';

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
  fill: ApexFill;
  colors: string[];
}

@Component({
  selector: 'app-replacements-trend-chart',
  standalone: true,
  imports: [NgApexchartsModule, MaterialModule, CommonModule, TablerIconsModule],
  templateUrl: './replacements-trend-chart.component.html', // <--- Updated
  styleUrls: ['./replacements-trend-chart.component.scss']   // <--- Updated
})
export class AppReplacementsTrendChartComponent implements OnInit {
  @ViewChild('chart') chart: ChartComponent = Object.create(null);
  public chartOptions: Partial<ChartOptions> | any;
  public isChartVisible = false;
  public totalYearly = 0;

  constructor(
    private reportService: ReportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.reportService.getReplacementTrend().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          
          const months = response.data.map(d => d.monthName);
          const counts = response.data.map(d => d.count);
          
          this.totalYearly = counts.reduce((a, b) => a + b, 0);

          this.initChart(counts, months);
          
          setTimeout(() => {
             this.isChartVisible = true;
             this.cdr.detectChanges();
          }, 0);
        }
      },
      error: (err) => {
        console.error('Failed to load trend data', err);
        this.isChartVisible = true; 
        this.cdr.detectChanges();
      }
    });
  }

  initChart(data: number[], categories: string[]) {
    this.chartOptions = {
      series: [{ name: 'Replacements', data: data }],
      chart: {
        type: 'area',
        height: 300,
        fontFamily: "'Plus Jakarta Sans', sans-serif;",
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { enabled: true },
        redrawOnParentResize: true // Ensure it redraws on rotation/resize
      },
      colors: ['#635bff'], 
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.05,
          stops: [0, 100]
        }
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      xaxis: {
        categories: categories,
        labels: { style: { colors: '#a1aab2' } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: { style: { colors: '#a1aab2' } }
      },
      grid: {
        borderColor: 'rgba(0,0,0,0.1)',
        strokeDashArray: 3,
      },
      tooltip: { theme: 'dark' },
    };
  }
}