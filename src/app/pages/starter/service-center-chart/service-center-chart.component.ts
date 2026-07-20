import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
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
  ApexResponsive,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { MaterialModule } from 'src/app/material.module';
import { ReportService, ReportPaginationRequestDto } from 'src/app/services/report.service';
import { CommonModule } from '@angular/common'; // Ensure CommonModule is imported
import { TablerIconsModule } from 'angular-tabler-icons';

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
  responsive: ApexResponsive[];
}

@Component({
  selector: 'app-service-center-chart',
  standalone: true,
  imports: [NgApexchartsModule, MaterialModule, CommonModule, TablerIconsModule], // Added CommonModule
  templateUrl: './service-center-chart.component.html', // Using external HTML for cleanliness
  styleUrls: ['./service-center-chart.component.scss']
})
export class AppServiceCenterChartComponent implements OnInit {
  @ViewChild('chart') chart: ChartComponent = Object.create(null);
  
  public chartOptions: Partial<ChartOptions> | any;
  public isChartVisible = false; // Control visibility

  constructor(
    private reportService: ReportService,
    private cdr: ChangeDetectorRef 
  ) {
    // Do NOT initialize chart here. Wait for data.
  }

  ngOnInit(): void {
    const request: ReportPaginationRequestDto = {
      pageIndex: 0,
      pageSize: 1000, // Fetch enough records to aggregate
      filter: '',
      sortColumn: 'TotalCount',
      sortDirection: 'desc'
    };

    this.reportService.getServiceCenterReport(request).subscribe((response) => {
      if (response.success && response.data) {
        
        // 1. Process Data
        const aggregator: { [key: string]: number } = {};
        response.data.forEach(item => {
          if (item.serviceCenterName) {
             aggregator[item.serviceCenterName] = (aggregator[item.serviceCenterName] || 0) + (Number(item.totalCount) || 0);
          }
        });

        // Sort and Slice
        const sortedData = Object.keys(aggregator)
          .map(key => ({ name: key, count: aggregator[key] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10); 

        const names = sortedData.map(d => d.name);
        const counts = sortedData.map(d => d.count);

        // 2. Build Chart Options with REAL data
        this.chartOptions = {
          series: [
            {
              name: 'Total Replacements',
              data: counts,
            },
          ],
          chart: {
            type: 'bar',
            height: 350,
            fontFamily: "'Plus Jakarta Sans', sans-serif;",
            toolbar: { show: false },
            // animations: { enabled: false }, // Optional: disable if flickering persists
            redrawOnParentResize: true
          },
          colors: ['#635bff'],
          plotOptions: {
            bar: {
              horizontal: true, 
              barHeight: '50%',
              borderRadius: 4,
            },
          },
          dataLabels: { enabled: false },
          stroke: {
            show: true,
            width: 0,
            colors: ['transparent'],
          },
          xaxis: {
            categories: names, 
            labels: {
              style: { colors: '#a1aab2' }
            }
          },
          yaxis: {
            labels: {
              style: {
                colors: '#a1aab2',
                fontSize: '13px'
              },
              maxWidth: 160 
            }
          },
          grid: {
            borderColor: 'rgba(0,0,0,0.1)',
            strokeDashArray: 3,
          },
          tooltip: {
            theme: 'dark',
          },
          responsive: [
            {
              breakpoint: 768,
              options: {
                yaxis: {
                  labels: {
                    maxWidth: 110,
                    style: { fontSize: '11px' }
                  }
                }
              }
            },
            {
              breakpoint: 480,
              options: {
                yaxis: {
                  labels: {
                    maxWidth: 80,
                    style: { fontSize: '10px' }
                  }
                }
              }
            }
          ]
        };

        // 3. Show Chart and Detect Changes
        this.isChartVisible = true;
        this.cdr.detectChanges();
      }
    });
  }
}