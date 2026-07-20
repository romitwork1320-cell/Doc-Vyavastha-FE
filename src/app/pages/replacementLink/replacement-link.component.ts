import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { ReplacementProductService } from 'src/app/services/replacement-product.service';
import { EncryptionService } from 'src/app/services/encryption.service';
import { TablerIconsModule } from 'angular-tabler-icons';
import { PublicityService, PublicityImage } from 'src/app/services/publicity.service'; // Import PublicityService and PublicityImage
import { ApiResponse } from 'src/app/common/interfaces/common'; // Import ApiResponse
import { environment } from 'src/app/environments/environments';
import { ProfileService } from 'src/app/services/profile.service';

// Interface for the incoming API response product
export interface ReplacementProduct {
  invertNo?: string; // Made optional to match the service
  groupStatus?: string; // Made optional
  productName?: string; // Made optional
  createdOn?: string; // Made optional
  statusName?: string;
}

// New interface for the grouped data structure
export interface GroupedReplacement {
  invertNo: string;
  groupStatus: string;
  createdOn: string;
  products: ReplacementProduct[];
}

@Component({
  selector: 'app-replacement-link',
  templateUrl: './replacement-link.component.html',
  styleUrls: ['./replacement-link.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    DatePipe,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    TablerIconsModule,
  ],
})
export class ReplacementLinkComponent implements OnInit, OnDestroy {
  public replacement: ReplacementProduct[] = [];
  public groupedReplacement: GroupedReplacement[] = [];
  public isLoading: boolean = true;
  public currentYear: number = new Date().getFullYear();
  public publicityImages: PublicityImage[] = []; // New property to hold the images
  tenantId: string | null;

  public companyLogoUrl: string | null = null;
  public defaultLogoUrl = './assets/images/logos/logo.png'; // Fallback logo
  private logoBaseUrl = `${environment.fileStorageUrl}/assets/images/companyLogos/`;

  private destroy$ = new Subject<void>();
  private googleReviewLink: string =
    'https://search.google.com/local/writereview?placeid=ChIJEY9IXdxP4DsRwX1VFWZ2Mq8';

  constructor(
    private route: ActivatedRoute,
    private replacementProductService: ReplacementProductService,
    private encryptionService: EncryptionService,
    private snackBar: MatSnackBar,
    private publicityService: PublicityService,
    private profileService: ProfileService 
  ) {}

  ngOnInit(): void {
    // Fetch publicity images when the component initializes
    
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.tenantId = params.get('tenantId');
      const encryptedInvertNo = params.get('id');
      if (this.tenantId) {
        // Fetch logo and images since we have a tenantId
        this.fetchPublicLogo(this.tenantId);
        this.fetchPublicityImages();

        if (encryptedInvertNo) {
          this.getReplacementDetails(this.tenantId, encryptedInvertNo);
        } else {
          // No invert number, but we can still show the page with logo/images
          this.isLoading = false;
          this.replacement = [];
          this.groupedReplacement = [];
        }
      } else {
        // No tenantId, show error
        this.isLoading = false;
        this.replacement = [];
        this.groupedReplacement = [];
      }
    });
  }

  private fetchPublicLogo(tenantId: string): void {
    this.profileService.getPublicLogo(tenantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Add cache-buster
            this.companyLogoUrl = this.logoBaseUrl + response.data + `?_=${new Date().getTime()}`;
          }
        },
        error: (err) => {
          console.error('Failed to fetch public logo', err);
          // It will just use the defaultLogoUrl
        }
      });
  }

  // New method to fetch publicity images from the API
  private fetchPublicityImages(): void {
    if (this.tenantId)
    {
      this.publicityService.getPublicityImages(this.tenantId)
        .pipe(
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: (response: ApiResponse<PublicityImage[]>) => {
            if (response.success && Array.isArray(response.data) && response.data.length > 0) {
              this.publicityImages = response.data;
            } else {
              this.publicityImages = [];
            }
          },
          error: (err) => {
            console.error('Failed to fetch publicity images', err);
            this.publicityImages = [];
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getReplacementDetails(tenantId: string, encryptedInvertNo: string): void {
    this.isLoading = true;

    this.replacementProductService.getReplacementProductByEncryptedInvertNo(tenantId, encryptedInvertNo)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: (response) => {
          if (response.success && Array.isArray(response.data) && response.data.length > 0) {
            this.replacement = response.data;

            const grouped: { [key: string]: GroupedReplacement } = {};

            response.data.forEach((current) => {
              const invoiceNo = current.invertNo;
              const groupStatus = current.groupStatus;
              const createdOn = current.createdOn;

              // Use type guards to ensure properties are not undefined before use
              if (invoiceNo && groupStatus && createdOn) {
                if (!grouped[invoiceNo]) {
                  grouped[invoiceNo] = {
                    invertNo: invoiceNo,
                    groupStatus: groupStatus,
                    createdOn: createdOn,
                    products: [],
                  };
                }
                grouped[invoiceNo].products.push({
                  ...current,
                  statusName: current.statusName || 'Pending',
                });
              }
            });

            this.groupedReplacement = Object.values(grouped);
          } else {
            this.replacement = [];
            this.groupedReplacement = [];
          }
        },
        error: (err) => {
          console.error('Failed to fetch replacement details', err);
          this.replacement = [];
          this.groupedReplacement = [];
          this.snackBar.open('Replacement details not found.', 'Close', { duration: 4000 });
        },
      });
  }

  isStatusActive(currentStatus: string, stepStatus: string): boolean {
    const statuses = ['pending', 'in progress', 'ready', 'completed'];
    const currentStatusIndex = statuses.indexOf(currentStatus.toLowerCase());
    const stepIndex = statuses.indexOf(stepStatus.toLowerCase());
    return stepIndex <= currentStatusIndex;
  }

  getStatusIcon(currentStatus: string, stepStatus: string): string {
    if (this.isStatusActive(currentStatus, stepStatus)) {
      return 'check_circle';
    }
    return 'radio_button_unchecked';
  }

  getGoogleReviewLink(): string {
    return this.googleReviewLink;
  }
}