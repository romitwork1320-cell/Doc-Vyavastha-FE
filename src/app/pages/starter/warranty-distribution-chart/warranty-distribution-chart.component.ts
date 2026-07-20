import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
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
import { TablerIconsModule } from 'angular-tabler-icons';
import { ReportService, DetailedReportPaginationRequestDto } from 'src/app/services/report.service';

export interface PieChartOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  plotOptions: ApexPlotOptions;
}

@Component({
  selector: 'app-warranty-distribution-chart',
  standalone: true,
  imports: [NgApexchartsModule, MaterialModule, CommonModule, TablerIconsModule],
  templateUrl: './warranty-distribution-chart.component.html',
  styleUrls: ['./warranty-distribution-chart.component.scss']
})
export class AppWarrantyDistributionChartComponent implements OnInit {
  @ViewChild('chart') chart: ChartComponent = Object.create(null);
  public chartOptions: Partial<PieChartOptions> | any;
  public isChartVisible = false;
  public hasData = false;

  constructor(
    private reportService: ReportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Using the detailed report to access warranty info
    const request: DetailedReportPaginationRequestDto = {
      pageIndex: 0,
      pageSize: 2000,
      filter: '',
      sortColumn: '',
      sortDirection: null,
      contactId: 0
    };

    this.reportService.getDetailedReplacedProductReport(request).subscribe((response) => {
      if (response.success && response.data) {
        let inWarranty = 0;
        let outWarranty = 0;

        response.data.forEach(item => {
          // Logic depends on your exact data structure. 
          // Assuming 'warrantyStatus' string or checking 'isUnderWarranty' boolean
          const status = (item as any).warrantyStatus || ''; 
          
          if (status.toLowerCase().includes('in warranty') || (item as any).isUnderWarranty) {
            inWarranty++;
          } else {
            outWarranty++;
          }
        });

        if (inWarranty + outWarranty > 0) {
           this.hasData = true;
           this.initChart(inWarranty, outWarranty);
        }
        
        this.isChartVisible = true;
        this.cdr.detectChanges();
      }
    });
  }

  initChart(inW: number, outW: number) {
    this.chartOptions = {
      series: [inW, outW],
      labels: ['In Warranty', 'Out of Warranty'],
      chart: {
        type: 'donut', // Changed to donut for a more modern look, or keep 'pie'
        height: 300,
        fontFamily: "'Plus Jakarta Sans', sans-serif;",
      },
      // Colors: Green (Good), Cyan/Blue (Out - matches badge)
      // You can adjust '#49beff' to '#ffae1f' (Orange) if you prefer 'Out' as a warning color
      colors: ['#36c76c', '#49beff'], 
      dataLabels: { enabled: false }, // Cleaner look without text on slices
      legend: {
        show: true,
        position: 'bottom',
        itemMargin: { horizontal: 10, vertical: 5 }
      },
      tooltip: { theme: 'dark' },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              total: {
                showAlways: true,
                show: true,
                label: 'Total Claims',
                fontSize: '13px',
                fontWeight: 600,
                color: '#7c8fac',
              },
              value: {
                fontSize: '24px',
                fontWeight: 700,
                color: '#2a3547',
              }
            }
          }
        }
      }
    };
  }
}