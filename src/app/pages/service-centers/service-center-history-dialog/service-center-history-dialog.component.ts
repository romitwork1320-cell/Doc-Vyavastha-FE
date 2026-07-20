import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatSnackBar } from '@angular/material/snack-bar';

// Services
import { ServiceCentersService, ServiceCenterHistoryDto, ServiceCenterUpdateDto } from 'src/app/services/service-centers.service';
import { ReplacementProductService } from 'src/app/services/replacement-product.service';

// Dialogs
import { ServiceCenterDialogComponent } from '../service-center-dialog/service-center-dialog.component';
import { ReplacementProductDialogComponent, DialogData } from '../../replacement-products/replacement-product-dialog/replacement-product-dialog.component';

@Component({
  selector: 'app-service-center-history-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    TablerIconsModule
  ],
  templateUrl: './service-center-history-dialog.component.html',
  styleUrls: ['./service-center-history-dialog.component.scss']
})
export class ServiceCenterHistoryDialogComponent implements OnInit {
  isLoading = true;
  historyData: ServiceCenterHistoryDto | null = null;
  
  // Columns for the Worklog Table
  displayedColumns: string[] = ['invertNo', 'date', 'product', 'serialNo', 'contact', 'status'];

  constructor(
    public dialogRef: MatDialogRef<ServiceCenterHistoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { serviceCenterId: number },
    private serviceCenterService: ServiceCentersService,
    private replacementService: ReplacementProductService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (this.data.serviceCenterId) {
      this.loadHistory();
    } else {
      this.isLoading = false;
    }
  }

  loadHistory() {
    this.isLoading = true;
    this.serviceCenterService.getServiceCenterHistory(this.data.serviceCenterId).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.historyData = res.data;
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error loading service center history', err);
      }
    });
  }

  closeDialog() {
    this.dialogRef.close();
  }

  // --- EDIT CENTER PROFILE ---
  openEditDialog(): void {
    if (!this.historyData) return;

    const dialogRef = this.dialog.open(ServiceCenterDialogComponent, {
      width: '600px',
      data: { action: 'Update', serviceCenter: this.historyData },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.event === 'Update') {
        const updateDto: ServiceCenterUpdateDto = {
          id: result.data.id,
          name: result.data.name,
          address: result.data.address,
          isActive: result.data.isActive
        };

        this.isLoading = true;
        this.serviceCenterService.updateServiceCenter(updateDto).subscribe({
          next: (res) => {
            if (res.success) {
              this.snackBar.open('Service Center updated successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
              this.loadHistory(); 
            } else {
              this.isLoading = false;
              this.snackBar.open('Update failed: ' + res.message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
            }
          },
          error: () => {
            this.isLoading = false;
            this.snackBar.open('Error updating service center', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        });
      }
    });
  }

  // --- OPEN REPLACEMENT JOB DETAILS ---
  openReplacementDialog(invertNo: string): void {
    this.isLoading = true;
    
    this.replacementService.getReplacementProductsByInvertNo(invertNo).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response.success && response.data && response.data.length > 0) {
          const product = response.data[0];
          
          const dialogData: DialogData = {
            action: 'Update',
            replacement: {
              id: product.id,
              invertNo: product.invertNo,
              contact: {
                id: product.contactId ?? 0,
                name: product.contactName || '',
                contactNo: product.contactNo || '',
                isActive: true,
              },
              replacedItems: [] 
            }
          };

          const dialogRef = this.dialog.open(ReplacementProductDialogComponent, {
            width: '1300px',
            data: dialogData,
            autoFocus: false
          });

          dialogRef.afterClosed().subscribe(result => {
             if (result && result.event !== 'Cancel') {
                this.loadHistory();
             }
          });
        } else {
          this.snackBar.open(`Details not found for ${invertNo}`, 'Close', { duration: 3000 });
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error(err);
        this.snackBar.open('Error fetching job details', 'Close', { duration: 3000 });
      }
    });
  }

  getStatusClass(status: string): string {
    if (!status) return 'bg-light-primary text-primary';
    const s = status.toLowerCase();
    if (s.includes('pending')) return 'bg-light-warning text-warning';
    if (s.includes('progress')) return 'bg-light-info text-info';
    if (s.includes('ready') || s.includes('complete')) return 'bg-light-success text-success';
    return 'bg-light-primary text-primary';
  }
}