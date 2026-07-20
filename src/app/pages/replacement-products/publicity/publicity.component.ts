import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PublicityImage, PublicityService } from 'src/app/services/publicity.service';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatDialog } from '@angular/material/dialog';
import { finalize, Subject, Subscription, takeUntil } from 'rxjs';
// FIX: Import dialog from its new, relative path
import { PublicitySettingsDialogComponent } from './publicity-settings-dialog/publicity-settings-dialog.component';
import { ApiResponse } from 'src/app/common/interfaces/common';
import { AuthService } from 'src/app/services/auth.service';
import { EncryptionService } from 'src/app/services/encryption.service';
import { FabClickService } from 'src/app/services/fab-click.service';
import { GlobalSearchService } from 'src/app/services/global-search.service';

@Component({
  selector: 'app-publicity', // New selector
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TablerIconsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    DatePipe
  ],
  providers: [DatePipe],
  templateUrl: './publicity.component.html', // New path
  styleUrls: ['./publicity.component.scss'] // New path
})
export class PublicityComponent implements OnInit, OnDestroy { // New class name
  private publicityService = inject(PublicityService);
  private snackBar = inject(MatSnackBar);
  public dialog = inject(MatDialog);
  private authService = inject(AuthService);
  private encryptionService = inject(EncryptionService);
  displayedColumns: string[] = ['#', 'image', 'title', 'link', 'uploadedOn', 'action'];
  dataSource: MatTableDataSource<PublicityImage> = new MatTableDataSource<PublicityImage>();
  isLoading: boolean = true;

  private fabClickService = inject(FabClickService);
  private destroy$ = new Subject<void>();
  private fabClickSubscription: Subscription;
  private globalSearchService = inject(GlobalSearchService);

  private searchSubscription: Subscription;
  private refreshSubscription: Subscription;

  constructor() {}

  ngOnInit(): void {
    // 1. Fetch data on load (unchanged)
    this.fetchImages();

    // 2. Listen for clicks on the global FAB
    this.fabClickSubscription = this.fabClickService.fabClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.openDialog('Add');
      });

    // 3. Listen for text in the global search bar
    this.searchSubscription = this.globalSearchService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe(query => {
        this.applyFilter(query);
      });

    // 4. Listen for Global Refresh events
    this.refreshSubscription = this.globalSearchService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fetchImages();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.fabClickSubscription) this.fabClickSubscription.unsubscribe();
    if (this.searchSubscription) this.searchSubscription.unsubscribe();
    if (this.refreshSubscription) this.refreshSubscription.unsubscribe();
  }

  applyFilter(filterValue: string): void {
    // Because fetchImages() loads all data into dataSource, we can filter client-side
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  fetchImages(): void {
    this.isLoading = true;
    const tenantId = this.authService.getTenantId();
    if (!tenantId) {
      this.snackBar.open("Error: Tenant ID is missing. Please log in again.", 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    const encryptedTenantId = this.encryptionService.encrypt(tenantId.toString());
    this.publicityService.getPublicityImages(encryptedTenantId)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: ApiResponse<PublicityImage[]>) => {
          if (response.success && response.data) {
            this.dataSource.data = response.data;
          } else {
            this.showError(response.message || 'Failed to fetch images.');
          }
        },
        error: (err) => {
          this.showError('An error occurred while fetching images.');
          console.error(err);
        }
      });
  }

  openDialog(action: string, image?: PublicityImage): void {
    const dialogData = {
      action: action,
      publicityImage: image ? { ...image } : {} as PublicityImage
    };

    const dialogRef = this.dialog.open(PublicitySettingsDialogComponent, {
      width: '600px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.event !== 'Cancel') {
        this.fetchImages(); 
        this.showSuccess(result.message);
      }
    });
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['bg-green-500', 'text-white']
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['bg-red-500', 'text-white']
    });
  }
}