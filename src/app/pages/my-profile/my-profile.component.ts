import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FullProfileDto, ProfileService } from 'src/app/services/profile.service';
import { Observable, Subject, takeUntil } from 'rxjs';
import { GlobalSearchService } from 'src/app/services/global-search.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatTabsModule, MatIconModule,
    TablerIconsModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
  templateUrl: './my-profile.component.html',
  // *** ADD: Link to your SCSS file ***
  styleUrls: ['./my-profile.component.scss'] 
})
export class MyProfileComponent implements OnInit {
  profileForm: FormGroup;
  isLoading = false;
  canEditCompany = false;

  // --- Logo Changes ---
  selectedLogoFile: File | null = null;
  logoPreview: string | ArrayBuffer | null = null;

  // *** CHANGE: Use the observable from the service ***
  companyLogoUrl$: Observable<string>;
  
  // *** REMOVED: local companyLogoUrl and logoBaseUrl are no longer needed ***
  // private companyLogoUrl: string | null = null; 
  // private logoBaseUrl = `${environment.fileStorageUrl}/CompanyLogos/`; 
  // ---

  searchTerm: string = '';
  private destroy$ = new Subject<void>();

  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private snackBar = inject(MatSnackBar);
  private globalSearchService = inject(GlobalSearchService);
  private authService = inject(AuthService);

  constructor() {
    // *** ADD: Assign the service observable ***
    this.companyLogoUrl$ = this.profileService.companyLogoUrl$;
  }

  get companyProfileForm(): FormGroup {
    return this.profileForm.get('companyProfile') as FormGroup;
  }

  get userProfileForm(): FormGroup {
    return this.profileForm.get('userProfile') as FormGroup;
  }

  ngOnInit(): void {
    const userRole = this.authService.getUserRole();
    this.canEditCompany = userRole === 'Admin' || userRole === 'Owner';
    // Form setup (your code is correct)
    this.profileForm = this.fb.group({
      companyProfile: this.fb.group({
        companyName: ['', [Validators.required]],
        companyLogoURL: [''], 
        gstin: [''],
        pan: [''],
        contactPhone: [''],
        supportPhone: [''],
        contactEmail: ['', [Validators.email]],
        website: [''],
        addressLine1: [''],
        addressLine2: [''],
        city: [''],
        state: [''],
        postalCode: [''],
        country: [''],
        ciN_NO: [''],
        msmE_NO: [''],
      }),
      userProfile: this.fb.group({
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        jobTitle: [''],
        contactNumber: [''],
      }),
    });

    if (!this.canEditCompany) {
      this.companyProfileForm.disable();
    }
    
    // *** CHANGE: Call the new, correct method name ***
    this.loadProfileAndSetLogo();

    this.globalSearchService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe(query => {
        this.searchTerm = query.toLowerCase().trim();
        // You can now use this.searchTerm in your HTML to highlight fields or filter tabs
        // console.log('Profile Search:', this.searchTerm); 
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // *** RENAMED & UPDATED: This method now calls the service method that updates the BehaviorSubject ***
  loadProfileAndSetLogo(): void {
    this.isLoading = true;
    this.logoPreview = null; // Clear preview on load
    this.selectedLogoFile = null; // Clear selected file on load
    
    // *** CHANGE: Call the service's 'loadProfileAndSetLogo' ***
    this.profileService.loadProfileAndSetLogo().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.profileForm.patchValue(response.data);
          
          // *** REMOVED: No need to manually set companyLogoUrl. ***
          // The service's BehaviorSubject and our async pipe handle this.
          
        } else {
          this.showError(response.message);
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.showError('Failed to load profile data.');
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2097152) { // 2MB size limit
        this.showError('File is too large. Max size is 2MB.');
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        this.showError('Invalid file type. Only JPG, PNG, or GIF allowed.');
        return;
      }

      this.selectedLogoFile = file;
      this.profileForm.markAsDirty(); 
      
      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  resetLogo(): void {
    this.logoPreview = null;
    this.companyProfileForm.get('companyLogoURL')?.setValue('');
    this.profileForm.markAsDirty(); 
  }

  onSaveChanges(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.showError('Please fill in all required fields.');
      return;
    }

    this.isLoading = true;
    const profileData: FullProfileDto = this.profileForm.getRawValue();

    if (this.logoPreview) {
      profileData.companyProfile.companyLogoURL = this.logoPreview as string;
    }

    this.profileService.updateProfile(profileData).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.showSuccess('Profile updated successfully!');
          this.profileForm.markAsPristine();
          
          // *** CHANGE: Call 'loadProfileAndSetLogo' ***
          // This reloads the form data AND updates the global BehaviorSubject,
          // which instantly updates the header.
          this.loadProfileAndSetLogo(); 
          
        } else {
          this.showError(response.message);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.showError('An error occurred while saving.');
      }
    });
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  showError(message: string): void {
    this.snackBar.open(message || 'An unknown error occurred.', 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}