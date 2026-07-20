import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectorRef, OnDestroy, ElementRef } from '@angular/core';
import { MatTableDataSource, MatTable } from '@angular/material/table';
import { MatSort, Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Observable, Subject, Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

import { Product, ProductCreateDto, ProductUpdateDto, ProductService } from 'src/app/services/products.service';
import { ApiResponse, PaginationRequestDto } from 'src/app/common/interfaces/common';
import { ProductDialogComponent, DialogData as ProductDialogData } from './product-dialog/product-dialog.component';
import { ProductImportDialogComponent } from './product-import-dialog/product-import-dialog.component';
import * as saveAs from 'file-saver';
import { GlobalImportExportService } from 'src/app/services/global-import-export.service';
import { GlobalSearchService } from 'src/app/services/global-search.service';
import { FabClickService } from 'src/app/services/fab-click.service';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TablerIconsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    RouterLink,
    MatMenuModule
  ]
})
export class ProductsComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['#', 'name', 'action'];
  dataSource: MatTableDataSource<Product> = new MatTableDataSource<Product>();
  isLoading: boolean = false;
  filterValue: string = '';
  
  public products: Product[] = []; 
  private currentPage: number = 0;
  private pageSize: number = 15;
  private hasMoreData: boolean = true;
  private filterSubject = new Subject<string>();
  isExporting: boolean = false;
  exportProgress: number = 0;
  private progressInterval: any;

  private destroy$ = new Subject<void>();
  private importClickSubscription: Subscription;
  private exportClickSubscription: Subscription;
  private fabClickSubscription: Subscription;
  private searchSubscription: Subscription;
  private refreshSubscription: Subscription;
  swipedProductId: number | string | null = null;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('tableContainer') tableContainer!: ElementRef;

  constructor(
    private productService: ProductService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef,
    private fabClickService: FabClickService,
    private globalSearchService: GlobalSearchService,
    private globalImportExportService: GlobalImportExportService
  ) {}

  ngOnInit(): void {
    // 1. Listen for clicks on the global FAB
    this.fabClickSubscription = this.fabClickService.fabClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.openDialog('Add');
      });

    this.refreshSubscription = this.globalSearchService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.resetAndLoadProducts();
      });

    // 2. Listen for text in the global search bar
    this.searchSubscription = this.globalSearchService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe(query => {
        this.filterValue = query;
        this.resetAndLoadProducts();
      });

    // 3. Listen for clicks on the global Import button
    this.importClickSubscription = this.globalImportExportService.importClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.openImportDialog();
      });

    // 4. Listen for clicks on the global Export button
    this.exportClickSubscription = this.globalImportExportService.exportClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.exportData('excel');
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.sort.sortChange.subscribe(() => {
      this.resetAndLoadProducts();
    });
    this.changeDetectorRef.detectChanges();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up subscriptions (optional, as takeUntil handles it)
    if (this.fabClickSubscription) this.fabClickSubscription.unsubscribe();
    if (this.searchSubscription) this.searchSubscription.unsubscribe();
    if (this.importClickSubscription) this.importClickSubscription.unsubscribe();
    if (this.exportClickSubscription) this.exportClickSubscription.unsubscribe();
    if (this.refreshSubscription) this.refreshSubscription.unsubscribe();
  }

  onScroll(event: Event): void {
    if (!this.isLoading && this.hasMoreData) {
      const element = event.target as HTMLElement;
      const threshold = 100;
      if (element.scrollHeight - element.scrollTop - element.clientHeight <= threshold) {
        this.loadProducts();
      }
    }
  }

  private resetAndLoadProducts(): void {
    this.products = [];
    this.currentPage = 0;
    this.hasMoreData = true;
    this.dataSource.data = [];
    this.loadProducts();
  }

  loadProducts(): void {
    if (this.isLoading || !this.hasMoreData) {
      return;
    }

    this.isLoading = true;
    
    const request: PaginationRequestDto = {
      pageIndex: this.currentPage,
      pageSize: this.pageSize,
      filter: this.filterValue,
      sortColumn: this.sort?.active,
      sortDirection: (this.sort?.direction || null) as 'asc' | 'desc' | null,
    };

    this.productService.getProducts(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: ApiResponse<Product[]>) => {
          if (response.success) {
            const newProducts = response.data || [];
            this.products = [...this.products, ...newProducts];
            this.dataSource.data = this.products;
            this.currentPage++;
            
            this.hasMoreData = newProducts.length === this.pageSize;
            this.checkAndLoadMore();
          } else {
            this.snackBar.open(`Error: ${response.message}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        },
        error: (error) => {
          console.error('Failed to load products:', error);
          this.snackBar.open('Failed to load products. Please try again.', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      });
  }

  openDialog(action: string, product?: Product): void {
    this.swipedProductId = null;
    
    const dialogData: ProductDialogData = {
      action: action,
      product: product ? { ...product } : {} as Product
    };

    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '600px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.event !== 'Cancel') {
        this.handleDialogAction(result.event, result.data);
      }
    });
  }

  handleDialogAction(action: string, data: Product): void {
    this.isLoading = true;
    let apiCall: Observable<ApiResponse<any>>;

    if (action === 'Add') {
      const createDto: ProductCreateDto = {
        name: data.name,
        defaultWarrantyDuration: data.defaultWarrantyDuration,
        defaultWarrantyUnit: data.defaultWarrantyUnit
      };
      apiCall = this.productService.createProduct(createDto);
    } else if (action === 'Update') {
      const updateDto: ProductUpdateDto = {
        id: data.id,
        name: data.name,
        isActive: data.isActive,
        defaultWarrantyDuration: data.defaultWarrantyDuration,
        defaultWarrantyUnit: data.defaultWarrantyUnit
      };
      apiCall = this.productService.updateProduct(updateDto);
    } else if (action === 'Delete') {
      apiCall = this.productService.deleteProduct(data.id);
    } else {
      this.isLoading = false;
      return;
    }

    apiCall.pipe(finalize(() => this.isLoading = false)).subscribe({
      next: (response: ApiResponse<any>) => {
        if (response.success) {
          this.snackBar.open(response.message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          
          if (action === 'Add') {
            this.products.unshift(response.data);
            this.dataSource.data = this.products;
          } else if (action === 'Update') {
            const index = this.products.findIndex(p => p.id === response.data.id);
            if (index > -1) {
              this.products[index] = response.data;
              this.dataSource.data = [...this.products];
            }
         } else if (action === 'Delete') {
            // --- FIX: Remove locally instead of reloading ---
            this.products = this.products.filter(p => p.id !== data.id);
            this.dataSource.data = [...this.products];

            // Edge Case: If table becomes empty, then reload to fetch previous page or show empty state correctly
            if (this.products.length === 0) {
              this.resetAndLoadProducts();
            }
          }

        } else {
          this.snackBar.open(`Error: ${response.message}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      },
      error: (error) => {
        console.error(`Failed to ${action} product:`, error);
        this.snackBar.open(`Failed to ${action} product. Please try again.`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }

  private startSimulatedProgress(): void {
    let progress = 0;
    this.globalImportExportService.setExportState(true, progress); // Report to service

    if (this.progressInterval) clearInterval(this.progressInterval);
    
    this.progressInterval = setInterval(() => {
      progress += 5;
      if (progress >= 95) clearInterval(this.progressInterval);
      this.globalImportExportService.setExportState(true, progress); // Report progress
    }, 100);
  }

  exportData(format: 'excel'): void {
    const currentState = this.globalImportExportService.currentState;
    if (currentState.isExporting) return;

    this.startSimulatedProgress();
    
    const request: PaginationRequestDto = {
      pageIndex: 0, pageSize: 0, filter: this.filterValue,
      sortColumn: this.sort?.active,
      sortDirection: (this.sort?.direction || null) as 'asc' | 'desc' | null,
    };

    this.productService.exportProducts(request)
      .subscribe({
        next: (data: Blob) => {
          clearInterval(this.progressInterval);
          this.globalImportExportService.setExportState(true, 100); // Report completion
          
          saveAs(data, `Products_${new Date().toISOString().slice(0, 10)}.xlsx`);
          this.snackBar.open('Export successful!', 'Close', { duration: 3000 });
          
          setTimeout(() => {
            this.globalImportExportService.setExportState(false, 0); // Reset service
          }, 1000);
        },
        error: (error) => {
          clearInterval(this.progressInterval);
          this.globalImportExportService.setExportState(false, 0); // Reset on error
          this.snackBar.open('Export failed. Please try again.', 'Close', { duration: 5000 });
        }
      });
  }

  openImportDialog(): void {
    const dialogRef = this.dialog.open(ProductImportDialogComponent, {
      width: '500px',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.resetAndLoadProducts();
      }
    });
  }

  private checkAndLoadMore(): void {
    // Wait a tick for the DOM to update with the new rows
    setTimeout(() => {
      if (!this.tableContainer || !this.hasMoreData || this.isLoading) {
        return;
      }

      const element = this.tableContainer.nativeElement;
      // If the content height is less than or equal to the container height, 
      // it means there is no scrollbar yet. Load more!
      if (element.scrollHeight <= element.clientHeight) {
        this.loadProducts();
      }
    }, 100);
  }

  onSwipe(id: number | string, action: 'open' | 'close') {
    if (action === 'open') {
      this.swipedProductId = id;
    } else {
      this.swipedProductId = null;
    }
  }
}