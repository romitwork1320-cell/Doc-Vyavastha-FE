// src/app/service-centers/service-centers.component.ts

import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectorRef, OnDestroy, ElementRef } from '@angular/core';
import { MatTableDataSource, MatTable } from '@angular/material/table';
import { MatSort, Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Observable, Subject, Subscription } from 'rxjs';

// Import the ServiceCenters service and models
import { ServiceCenter, ServiceCenterCreateDto, ServiceCenterUpdateDto, ServiceCentersService } from 'src/app/services/service-centers.service';
// Import the ServiceCenterDialogComponent
import { ServiceCenterDialogComponent, DialogData as ServiceCenterDialogData } from './service-center-dialog/service-center-dialog.component';

// Standalone component imports
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
// Removed MatPaginatorModule
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ApiResponse, PaginationRequestDto } from 'src/app/common/interfaces/common';
import { ServiceCenterImportDialogComponent } from './service-center-import-dialog/service-center-import-dialog.component';
import * as saveAs from 'file-saver';
import { GlobalImportExportService } from 'src/app/services/global-import-export.service';
import { GlobalSearchService } from 'src/app/services/global-search.service';
import { FabClickService } from 'src/app/services/fab-click.service';
import { SwipeableDirective } from 'src/app/common/directive/swipeable.directive';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-service-centers',
  templateUrl: './service-centers.component.html',
  styleUrls: ['./service-centers.component.scss'],
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
    // MatPaginatorModule removed here
    MatSortModule,
    MatProgressSpinnerModule,
    RouterLink,
    SwipeableDirective,
    MatMenuModule,
    MatTooltipModule
  ]
})
export class ServiceCentersComponent implements OnInit, AfterViewInit, OnDestroy {
  // Displayed columns for the table
  displayedColumns: string[] = ['#', 'name', 'address', 'action'];
  dataSource: MatTableDataSource<ServiceCenter> = new MatTableDataSource<ServiceCenter>();
  isLoading: boolean = false;
  filterValue: string = '';
  isExporting: boolean = false;
  exportProgress: number = 0;
  swipedServiceCenterId: number | string | null = null;

  // Properties for infinite scroll
  public serviceCenters: ServiceCenter[] = [];
  private currentPage: number = 0;
  private pageSize: number = 15;
  private hasMoreData: boolean = true;
  private filterSubject = new Subject<string>();

  private destroy$ = new Subject<void>();
  private importClickSubscription: Subscription;
  private exportClickSubscription: Subscription;
  private fabClickSubscription: Subscription;
  private searchSubscription: Subscription;
  private progressInterval: any; // For export simulation
  private refreshSubscription: Subscription;

  // ViewChild decorators to get references to MatSort and MatTable
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatTable) table?: MatTable<any>;
  @ViewChild('tableContainer') tableContainer!: ElementRef;

  constructor(
    private serviceCentersService: ServiceCentersService, // Inject ServiceCentersService
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef,
    private fabClickService: FabClickService,
    private globalSearchService: GlobalSearchService,
    private globalImportExportService: GlobalImportExportService
  ) { }

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
        this.resetAndLoadServiceCenters();
      });

    // 2. Listen for text in the global search bar
    this.searchSubscription = this.globalSearchService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe(query => {
        this.filterValue = query;
        this.resetAndLoadServiceCenters();
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
    // We now have to manually set the data source for the sort
    this.dataSource.sort = this.sort;

    // Subscribe to sort events
    this.sort.sortChange.subscribe(() => {
      this.resetAndLoadServiceCenters();
    });

    // Manually run change detection to avoid ExpressionChangedAfterItHasBeenCheckedError
    this.changeDetectorRef.detectChanges();

    // Initial data load
    this.loadServiceCenters();
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

  /**
   * New method to handle infinite scrolling.
   * @param event The scroll event object.
   */
  onScroll(event: Event): void {
    if (!this.isLoading && this.hasMoreData) {
      const element = event.target as HTMLElement;
      // Define a threshold in pixels from the bottom of the container
      const threshold = 100;
      if (element.scrollHeight - element.scrollTop - element.clientHeight <= threshold) {
        this.loadServiceCenters();
      }
    }
  }

  /**
   * Method to reset the state for a new search or sort.
   */
  private resetAndLoadServiceCenters(): void {
    this.serviceCenters = [];
    this.currentPage = 0;
    this.hasMoreData = true;
    this.dataSource.data = [];
    this.loadServiceCenters();
  }

  /**
   * Loads service centers from the API and updates the table.
   */
  loadServiceCenters(): void {
    // Prevent loading if there is no more data or a load is already in progress
    if (this.isLoading || !this.hasMoreData) {
      return;
    }

    this.isLoading = true;

    // Create the pagination request DTO
    const request: PaginationRequestDto = {
      pageIndex: this.currentPage,
      pageSize: this.pageSize,
      filter: this.filterValue,
      sortColumn: this.sort?.active,
      sortDirection: (this.sort?.direction || null) as 'asc' | 'desc' | null,
    };

    // Make the API call with the pagination request
    this.serviceCentersService.getServiceCenters(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: ApiResponse<ServiceCenter[]>) => {
          if (response.success) {
            const newServiceCenters = response.data || [];
            // Append the new data to the existing array
            this.serviceCenters = [...this.serviceCenters, ...newServiceCenters];
            // Update the data source
            this.dataSource.data = this.serviceCenters;
            this.currentPage++;

            // Check if we've reached the end of the data
            this.hasMoreData = newServiceCenters.length === this.pageSize;
            this.checkAndLoadMore();
          } else {
            this.snackBar.open(`Error: ${response.message}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
          }
        },
        error: (error) => {
          console.error('Failed to load service centers:', error);
          this.snackBar.open('Failed to load service centers. Please try again.', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      });
  }

  /**
   * Opens the ServiceCenterDialogComponent for Add, Update, or Delete operations.
   * @param action The type of action ('Add', 'Update', 'Delete').
   * @param serviceCenter The service center object (optional, for Update/Delete).
   */
  openDialog(action: string, serviceCenter?: ServiceCenter): void {
    this.swipedServiceCenterId = null;
    
    const dialogData: ServiceCenterDialogData = {
      action: action,
      serviceCenter: serviceCenter ? { ...serviceCenter } : {} as ServiceCenter
    };

    const dialogRef = this.dialog.open(ServiceCenterDialogComponent, {
      width: '600px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.event !== 'Cancel') {
        this.handleDialogAction(result.event, result.data);
      }
    });
  }

  /**
   * Handles the action returned from the dialog (Add, Update, Delete).
   * @param action The action type.
   * @param data The service center data.
   */
  handleDialogAction(action: string, data: ServiceCenter): void {
    this.isLoading = true;
    let apiCall: Observable<ApiResponse<any>>;

    if (action === 'Add') {
      const createDto: ServiceCenterCreateDto = {
        name: data.name,
        address: data.address,
        mapLocationUrl: data.mapLocationUrl
      };
      apiCall = this.serviceCentersService.createServiceCenter(createDto);
    } else if (action === 'Update') {
      const updateDto: ServiceCenterUpdateDto = {
        id: data.id,
        name: data.name,
        address: data.address,
        mapLocationUrl: data.mapLocationUrl,
        isActive: data.isActive
      };
      apiCall = this.serviceCentersService.updateServiceCenter(updateDto);
    } else if (action === 'Delete') {
      apiCall = this.serviceCentersService.deleteServiceCenter(data.id);
    } else {
      this.isLoading = false;
      return;
    }

    apiCall.pipe(finalize(() => this.isLoading = false)).subscribe({
      next: (response: ApiResponse<any>) => {
        if (response.success) {
          this.snackBar.open(response.message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          // --- Updated logic for Add/Update/Delete ---
          if (action === 'Add' && response.data) {
            // Add the new service center to the beginning of the array
            this.serviceCenters.unshift(response.data);
            this.dataSource.data = this.serviceCenters;
          } else if (action === 'Update' && response.data) {
            // Find and update the service center in the array
            const index = this.serviceCenters.findIndex(sc => sc.id === response.data.id);
            if (index > -1) {
              this.serviceCenters[index] = response.data;
              this.dataSource.data = [...this.serviceCenters]; // Use spread operator to trigger change detection
            }
          } else if (action === 'Delete') {
            this.serviceCenters = this.serviceCenters.filter(sc => sc.id !== data.id);
            this.dataSource.data = [...this.serviceCenters];

            // Edge Case: If table becomes empty, then reload to fetch previous page or show empty state correctly
            if (this.serviceCenters.length === 0) {
              this.resetAndLoadServiceCenters();
            }
          }
          
        } else {
          this.snackBar.open(`Error: ${response.message}`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      },
      error: (error) => {
        console.error(`Failed to ${action} service center:`, error);
        this.snackBar.open(`Failed to ${action} service center. Please try again.`, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }

  private startSimulatedProgress(): void {
    let progress = 0;
    this.globalImportExportService.setExportState(true, progress); // Report to service

    if (this.progressInterval) clearInterval(this.progressInterval);
    
    this.progressInterval = setInterval(() => {
      progress += 5;
      if (progress >= 95) {
        clearInterval(this.progressInterval);
      }
      this.globalImportExportService.setExportState(true, progress); // Report progress
    }, 100);
  }

  exportData(format: 'excel'): void {
    const currentState = this.globalImportExportService.currentState;
    if (currentState.isExporting) return;

    this.startSimulatedProgress();
    
    const request: PaginationRequestDto = {
      pageIndex: 0,
      pageSize: 0,
      filter: this.filterValue,
      sortColumn: this.sort?.active,
      sortDirection: (this.sort?.direction || null) as 'asc' | 'desc' | null,
    };

    this.serviceCentersService.exportServiceCenters(request)
      .subscribe({
        next: (data: Blob) => {
          clearInterval(this.progressInterval);
          this.globalImportExportService.setExportState(true, 100); // Report completion
          
          saveAs(data, `ServiceCenters_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
    const dialogRef = this.dialog.open(ServiceCenterImportDialogComponent, {
      width: '500px',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.resetAndLoadServiceCenters();
      }
    });
  }

  private checkAndLoadMore(): void {
    // Wait a tick for the DOM to update with the new rows
    setTimeout(() => {
      // Safety checks
      if (!this.tableContainer || !this.hasMoreData || this.isLoading) {
        return;
      }

      const element = this.tableContainer.nativeElement;
      
      // Logic: If the total height (scrollHeight) is less than or equal to 
      // the visible height (clientHeight), there is no scrollbar yet.
      // Therefore, we must load more data immediately.
      if (element.scrollHeight <= element.clientHeight) {
        this.loadServiceCenters();
      }
    }, 100); // 100ms delay allows the DOM to render the rows
  }

  onSwipe(id: number | string, action: 'open' | 'close') {
    if (action === 'open') {
      this.swipedServiceCenterId = id;
    } else {
      this.swipedServiceCenterId = null;
    }
  }
}
