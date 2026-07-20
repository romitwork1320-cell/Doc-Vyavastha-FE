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
  ApexResponsive,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { MaterialModule } from 'src/app/material.module';
import { ReportService } from 'src/app/services/report.service';
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
  selector: 'app-most-replaced-products-chart',
  standalone: true,
  imports: [NgApexchartsModule, MaterialModule, CommonModule, TablerIconsModule],
  templateUrl: './most-replaced-products-chart.component.html', 
  styleUrls: ['./most-replaced-products-chart.component.scss']   
})
export class AppMostReplacedProductsChartComponent implements OnInit {
  @ViewChild('chart') chart: ChartComponent = Object.create(null);
  
  public chartOptions: Partial<ChartOptions> | any;
  public isChartVisible = false; 
  public hasData = false;        

  constructor(
    private reportService: ReportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Call the endpoint
    this.reportService.getTopReplacedProducts().subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.length > 0) {
          this.hasData = true;
          
          const productNames = response.data.map(item => item.productName);
          const productCounts = response.data.map(item => item.replacementCount);

          this.chartOptions = {
            series: [{ name: 'Replacement Count', data: productCounts }],
            chart: {
              type: 'bar',
              height: 350,
              fontFamily: "'Plus Jakarta Sans', sans-serif;",
              toolbar: { show: false },
              redrawOnParentResize: true,
              animations: { enabled: true }
            },
            colors: ['#16cdc7'], // Teal color
            plotOptions: {
              bar: {
                horizontal: true,
                barHeight: '50%',
                borderRadius: 4,
              },
            },
            dataLabels: { enabled: false },
            stroke: { show: true, width: 0, colors: ['transparent'] },
            xaxis: {
              categories: productNames,
              labels: { style: { colors: '#a1aab2' } }
            },
            yaxis: {
              labels: {
                style: { colors: '#a1aab2', fontSize: '13px' },
                maxWidth: 200 
              }
            },
            grid: { borderColor: 'rgba(0,0,0,0.1)', strokeDashArray: 3 },
            tooltip: { theme: 'dark' },
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

          // Use setTimeout to ensure DOM is ready for the chart
          setTimeout(() => {
            this.isChartVisible = true;
            this.cdr.detectChanges();
          }, 0);

        } else {
          this.hasData = false;
          this.isChartVisible = true; // Stop loading spinner
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error loading Top Replaced Products:', err);
        this.hasData = false;
        this.isChartVisible = true; 
        this.cdr.detectChanges();
      }
    });
  }
}