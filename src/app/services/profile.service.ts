import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs'; // Import BehaviorSubject
import { tap } from 'rxjs/operators'; // Import tap
import { environment } from 'src/app/environments/environments';
import { ApiResponse } from '../common/interfaces/common';

// --- DTO Interfaces ---
export interface CompanyProfileDto {
  companyName?: string;
  companyLogoURL?: string; 
  contactEmail?: string;
  contactPhone?: string;
  supportPhone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  gstin?: string;
  pan?: string;
  ciN_NO?: string;
  msmE_NO?: string;
}

export interface UserProfileDto {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  contactNumber?: string;
}

export interface FullProfileDto {
  companyProfile: CompanyProfileDto;
  userProfile: UserProfileDto;
}
// --- End DTO ---

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = `${environment.apiUrl}/Profile`;
  private http = inject(HttpClient);

  // The backend already returns paths starting with /uploads/ (e.g. /uploads/1/logo.png)
  // so we do not need a base path here, or we can just use the runtime origin.
  private logoBaseUrl = '';
  
  // *** UPDATE THIS PATH to your default logo ***
  private defaultLogoUrl = '/assets/images/logos/dreamworld-logo.svg'; 
  
  // Holds the full, ready-to-use URL for the logo
  private companyLogoUrlSubject = new BehaviorSubject<string>(this.defaultLogoUrl);
  
  // Public observable for components to subscribe to
  public companyLogoUrl$ = this.companyLogoUrlSubject.asObservable();
  // ---

  constructor() { }

  // --- ADDED: New method to load profile AND update the BehaviorSubject ---
  /**
   * Gets the user's profile and updates the shared companyLogoUrl$ observable.
   */
  loadProfileAndSetLogo(): Observable<ApiResponse<FullProfileDto>> {
    return this.getProfile().pipe(
      tap(response => {
        if (response.success && response.data?.companyProfile?.companyLogoURL) {
          // Base64 string doesn't need cache-busting
          const fullLogoUrl = this.logoBaseUrl + response.data.companyProfile.companyLogoURL;
          this.companyLogoUrlSubject.next(fullLogoUrl);
        } else {
          // Use default if no logo is set or call fails
          this.companyLogoUrlSubject.next(this.defaultLogoUrl);
        }
      })
    );
  }

  /**
   * Just gets the profile data without updating the shared logo.
   * `loadProfileAndSetLogo` is now the preferred method for most cases.
   */
  getProfile(): Observable<ApiResponse<FullProfileDto>> {
    return this.http.get<ApiResponse<FullProfileDto>>(this.apiUrl);
  }

  updateProfile(profileData: FullProfileDto): Observable<ApiResponse<object>> {
    return this.http.put<ApiResponse<object>>(this.apiUrl, profileData);
  }

  getPublicLogo(tenantId: string): Observable<ApiResponse<string>> {
    return this.http.get<ApiResponse<string>>(`${this.apiUrl}/public-logo/${tenantId}`);
  }

  // --- ADDED: Helper to manually update logo (e.g., on logout) ---
  /**
   * Resets the shared logo URL back to the default.
   */
  resetLogoToDefault(): void {
    this.companyLogoUrlSubject.next(this.defaultLogoUrl);
  }
}