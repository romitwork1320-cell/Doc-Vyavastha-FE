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
import { ProductService, ProductHistoryDto, ProductUpdateDto } from 'src/app/services/products.service';
import { ReplacementProductService } from 'src/app/services/replacement-product.service';

// Dialogs
import { ProductDialogComponent } from '../product-dialog/product-dialog.component';
import { ReplacementProductDialogComponent, DialogData } from '../../replacement-products/replacement-product-dialog/replacement-product-dialog.component';

@Component({
  selector: 'app-product-history-dialog',
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
  templateUrl: './product-history-dialog.component.html',
  styleUrls: ['./product-history-dialog.component.scss']
})
export class ProductHistoryDialogComponent implements OnInit {
  isLoading = true;
  historyData: ProductHistoryDto | null = null;
  
  // Columns: Notice 'customer' instead of 'product'
  displayedColumns: string[] = ['invertNo', 'date', 'customer', 'serialNo', 'warranty', 'center', 'status'];

  constructor(
    public dialogRef: MatDialogRef<ProductHistoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { productId: number },
    private productService: ProductService,
    private replacementService: ReplacementProductService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (this.data.productId) {
      this.loadHistory();
    } else {
      this.isLoading = false;
    }
  }

  loadHistory() {
    this.isLoading = true;
    this.productService.getProductHistory(this.data.productId).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.historyData = res.data;
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error loading product history', err);
      }
    });
  }

  closeDialog() {
    this.dialogRef.close();
  }

  // --- EDIT PRODUCT MASTER ---
  openEditDialog(): void {
    if (!this.historyData) return;

    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '600px',
      data: { action: 'Update', product: this.historyData }, // Pass current data
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.event === 'Update') {
        const updateDto: ProductUpdateDto = {
          id: result.data.id,
          name: result.data.name,
          isActive: result.data.isActive,
          defaultWarrantyDuration: result.data.defaultWarrantyDuration,
          defaultWarrantyUnit: result.data.defaultWarrantyUnit
        };

        this.isLoading = true;
        this.productService.updateProduct(updateDto).subscribe({
          next: (res) => {
            if (res.success) {
              this.snackBar.open('Product updated successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
              this.loadHistory(); 
            } else {
              this.isLoading = false;
              this.snackBar.open('Update failed: ' + res.message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
            }
          },
          error: () => {
            this.isLoading = false;
            this.snackBar.open('Error updating product', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        });
      }
    });
  }

  // --- OPEN REPLACEMENT DETAILS ---
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
        this.snackBar.open('Error fetching replacement details', 'Close', { duration: 3000 });
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