import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, firstValueFrom } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../environments/environments';
import { Router } from '@angular/router';

// --- TYPE DEFINITIONS ---
export interface ApiResponse<T> {
  data: T | null;
  success: boolean;
  message: string;
  statusCode: number;
}

export interface TenantSelection {
  tenantId: number;
  tenantName: string;
  role: string;
  isActive: boolean;
}

export interface GoogleLoginResponse {
  requiresSelection: boolean;
  token?: string;
  refreshToken?: string;
  tenants?: TenantSelection[];
  isProfileComplete?: boolean;
  isNewUser?: boolean;
}

export interface LoginResponseData {
  token: string;
  refreshToken?: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
}

export interface TokenResponseData {
  accessToken: string;
  refreshToken?: string;
}

interface DecodedToken {
  permissions: PagePermission[];
  exp: number;
  TenantId: string;
  role: string;
  UserId: string;
}

export interface PagePermission {
  PageUrl: string;
  CanView: boolean;
  CanAdd: boolean;
  CanEdit: boolean;
  CanDelete: boolean;
}
type PermissionType = 'CanView' | 'CanAdd' | 'CanEdit' | 'CanDelete';

export interface SetPasswordDto {
  userId: number;
  token: string;
  newPassword: string;
}

export interface SelectTenantRequest {
  tenantId: number;
  rememberMe: boolean;
}

export interface SendOtpRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otpCode: string;
}

export interface CompleteProfileRequest {
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  companyName: string;
}

export interface OtpLoginResponse {
  isProfileComplete: boolean;
  isNewUser: boolean;
  authData?: LoginResponseData;
  tenantData?: GoogleLoginResponse;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/Auth`;
  private usersApiUrl = `${environment.apiUrl}/Users`; // ✨ Added for permission fetching

  private loggedIn = new BehaviorSubject<boolean>(false);
  private permissions = new BehaviorSubject<PagePermission[]>([]);
  private userPermissions: PagePermission[] = [];

  private activeBranchId = new BehaviorSubject<string | null>(null);
  public activeBranchId$ = this.activeBranchId.asObservable();

  public isLoggedIn$ = this.loggedIn.asObservable();
  public permissions$ = this.permissions.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // ✨ REMOVED: checkInitialLoginState() from here.
    // Logic is moved to initializeAuth() which is called by APP_INITIALIZER
  }

  // --- ✨ NEW: APP_INITIALIZER Logic ---
  // This runs before the app starts. It waits for permissions to load.
  public initializeAuth(): Promise<void> {
    if (!this.isPlatformBrowser()) return Promise.resolve();

    // Connected to EDConsultancy-BE: trust a stored access token on reload,
    // otherwise the AuthGuard will route the user to /login.
    const token = this.getAccessToken();
    if (!token) {
      this.loggedIn.next(false);
      return Promise.resolve();
    }

    this.loadTokenData();
    this.loadActiveBranch();
    this.loggedIn.next(true);
    // Load fresh permissions before bootstrap completes; ignore failures.
    return firstValueFrom(this.loadPermissionsFromApi())
      .then(() => undefined)
      .catch(() => undefined);
  }

  // --- ✨ NEW: Branch Management ---
  public loadActiveBranch(): void {
    if (this.isPlatformBrowser()) {
      const branchId = localStorage.getItem('activeBranchId');
      if (branchId) {
        this.activeBranchId.next(branchId);
      }
    }
  }

  public setActiveBranch(branchId: string): void {
    if (this.isPlatformBrowser()) {
      localStorage.setItem('activeBranchId', branchId);
      this.activeBranchId.next(branchId);
    }
  }

  public getActiveBranchId(): string | null {
    return this.activeBranchId.value;
  }

  // --- ✨ NEW: Fetch Permissions from API ---
  public loadPermissionsFromApi(): Observable<any> {
    const userId = this.getUserId();
    if (!userId) {
      return of(null);
    }

    // Call GET api/Users/{id}/permissions
    return this.http.get<ApiResponse<PagePermission[]>>(`${this.usersApiUrl}/${userId}/permissions`).pipe(
      tap(response => {
        if (response.success && response.data) {
          // Simply assign the full permissions directly from the backend
          this.userPermissions = response.data;
          this.permissions.next(this.userPermissions);
        }
      }),
      catchError(err => {
        console.error('❌ Failed to fetch live permissions', err);
        // Fallback: If API fails, 'userPermissions' might still have data from loadTokenData if available
        return of(null);
      })
    );
  }

  // --- ✨ NEW: Trigger a live background refresh of permissions ---
  public refreshPermissions(): void {
    if (this.getAccessToken()) {
      this.loadPermissionsFromApi().subscribe();
    }
  }

  public getUserBranches(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/UserBranches/me`);
  }

  public getUserId(): number | null {
    if (!this.isPlatformBrowser()) return null;

    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const decoded: DecodedToken = jwtDecode(token);
      return decoded.UserId ? parseInt(decoded.UserId, 10) : null;
    } catch (error) {
      console.error('Error decoding token to get UserId', error);
      return null;
    }
  }

  // --- 2. AUTH METHODS ---

  public sendLoginOtp(email: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/send-otp`, { email });
  }

  public verifyLoginOtp(data: VerifyOtpRequest): Observable<ApiResponse<OtpLoginResponse>> {
    return this.http.post<ApiResponse<OtpLoginResponse>>(`${this.apiUrl}/verify-otp`, data)
      .pipe(tap(res => {
        if (res.success && res.data?.isProfileComplete && res.data.tenantData) {
          this.handleOtpSuccess(res.data.tenantData);
        }
      }));
  }

  public completeUserProfile(data: CompleteProfileRequest): Observable<ApiResponse<GoogleLoginResponse>> {
    return this.http.post<ApiResponse<GoogleLoginResponse>>(`${this.apiUrl}/complete-profile`, data)
      .pipe(tap(res => {
        if (res.success && res.data) {
          this.handleLoginResponse(res, true);
        }
      }));
  }

  public login(username: string, password: string, rememberMe: boolean): Observable<ApiResponse<GoogleLoginResponse>> {
    return this.http.post<ApiResponse<GoogleLoginResponse>>(`${this.apiUrl}/login`, { username, password, rememberMe }).pipe(
      tap(response => this.handleLoginResponse(response, rememberMe))
    );
  }

  public loginWithGoogle(idToken: string, rememberMe: boolean): Observable<ApiResponse<GoogleLoginResponse>> {
    return this.http.post<ApiResponse<GoogleLoginResponse>>(`${this.apiUrl}/google-login`, { idToken, rememberMe }).pipe(
      tap(response => this.handleLoginResponse(response, rememberMe))
    );
  }

  public selectTenant(tenantId: number): Observable<ApiResponse<LoginResponseData>> {
    const isRemembered = this.isPlatformBrowser() && !!localStorage.getItem('temp_token');

    const payload: SelectTenantRequest = {
      tenantId: tenantId,
      rememberMe: isRemembered
    };

    return this.http.post<ApiResponse<LoginResponseData>>(`${this.apiUrl}/select-tenant`, payload)
      .pipe(
        tap(response => {
          if (response.success && response.data?.token) {
            this.setFinalSession(response.data.token, isRemembered);
          } else {
            this.logout();
          }
        })
      );
  }

  public refreshToken(): Observable<ApiResponse<TokenResponseData>> {
    return this.http.post<ApiResponse<TokenResponseData>>(`${this.apiUrl}/refresh-token`, {})
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            const usedLocalStorage = !!localStorage.getItem('access_token');
            this.storeAccessToken(response.data.accessToken, 'access_token', usedLocalStorage);
            this.loadTokenData();
            // Optional: Reload permissions on token refresh too
            this.loadPermissionsFromApi().subscribe();
          } else {
            this.logout();
          }
        })
      );
  }

  public logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      error: (err) => console.error('Backend logout failed', err)
    });

    if (this.isPlatformBrowser()) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('user_role');
      localStorage.removeItem('temp_token');
      localStorage.removeItem('user_id');

      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('tenant_id');
      sessionStorage.removeItem('user_role');
      sessionStorage.removeItem('temp_token');
      sessionStorage.removeItem('user_id');
    }

    this.userPermissions = [];
    this.loggedIn.next(false);
    this.router.navigate(['/login']);
  }

  // --- 3. HELPER METHODS ---

  public attemptAutoLogin(): Observable<boolean> {
    this.loggedIn.next(true);
    return of(true);
  }

  private handleLoginResponse(response: ApiResponse<GoogleLoginResponse>, rememberMe: boolean): void {
    if (!response.success || !response.data) return;

    if (response.data.isNewUser || response.data.isProfileComplete === false) {
      return;
    }

    if (response.data.requiresSelection) {
      this.storeAccessToken(response.data.token!, 'temp_token', rememberMe);
      this.router.navigate(['/workspace-selection'], {
        state: { tenants: response.data.tenants },
      });
    } else {
      if (response.data.token) {
        this.setFinalSession(response.data.token, rememberMe);
      }
    }
  }

  public handleSuccessfulLogin(data: LoginResponseData, rememberMe: boolean = false): void {
    this.setFinalSession(data.token, rememberMe);
  }

  // ✨ MODIFIED: Now waits for permissions before navigating
  private setFinalSession(accessToken: string, rememberMe: boolean = false): void {
    this.storeAccessToken(accessToken, 'access_token', rememberMe);

    if (this.isPlatformBrowser()) {
      localStorage.removeItem('temp_token');
      sessionStorage.removeItem('temp_token');
    }

    this.loadTokenData(rememberMe);
    this.loggedIn.next(true);

    // ✨ Fetch fresh permissions immediately, THEN navigate
    this.loadPermissionsFromApi().subscribe(() => {
      this.navigateBasedOnRole();
    });
  }

  private loadTokenData(rememberMe: boolean = true): void {
    if (!this.isPlatformBrowser()) return;

    const token = this.getAccessToken();
    // We do NOT clear permissions here anymore, we let the API fill them

    if (token) {
      try {
        const decodedToken: DecodedToken = jwtDecode(token);

        // Fallback: Use token permissions momentarily if API hasn't loaded yet
        if (this.userPermissions.length === 0) {
          this.userPermissions = decodedToken.permissions || [];
          this.permissions.next(this.userPermissions);
        }

        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('tenant_id', decodedToken.TenantId);
        storage.setItem('user_role', decodedToken.role);

        if (decodedToken.UserId) {
          storage.setItem('user_id', decodedToken.UserId);
        }

      } catch (error) {
        this.logout();
      }
    }
  }

  // --- Storage Wrappers ---

  public getAccessToken(): string | null {
    if (!this.isPlatformBrowser()) return null;
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  }

  public storeTokens(accessToken: string, refreshToken: string | null, rememberMe: boolean = false): void {
    if (accessToken) {
      this.storeAccessToken(accessToken, 'access_token', rememberMe);
    }
  }

  private storeAccessToken(token: string, key: string = 'access_token', rememberMe: boolean = true): void {
    if (this.isPlatformBrowser() && token) {
      if (rememberMe) {
        localStorage.setItem(key, token);
      } else {
        sessionStorage.setItem(key, token);
      }
    }
  }

  public getTenantId(): number | null {
    if (!this.isPlatformBrowser()) return null;
    const tenantId = localStorage.getItem('tenant_id') || sessionStorage.getItem('tenant_id');
    return tenantId ? parseInt(tenantId, 10) : null;
  }

  public getRefreshToken(): string | null {
    return null;
  }

  private isPlatformBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  public hasPermission(requestedUrl: string, permission: PermissionType): boolean {
    const role = this.getUserRole();
    if (role === 'Admin' || role === 'Owner') {
      return true;
    }

    // Check userPermissions array
    const p = this.userPermissions.find(x => x.PageUrl && requestedUrl && x.PageUrl.toLowerCase() === requestedUrl.toLowerCase());
    if (!p) {
      return false; // Default deny if page not found
    }

    switch (permission) {
      case 'CanView': return p.CanView;
      case 'CanAdd': return p.CanAdd;
      case 'CanEdit': return p.CanEdit;
      case 'CanDelete': return p.CanDelete;
      default: return false;
    }
  }

  // Standard API wrappers...
  public signUp(dto: SignUpRequest): Observable<ApiResponse<object>> {
    return this.http.post<ApiResponse<object>>(`${this.apiUrl}/signup`, dto);
  }
  public signUpWithGoogle(idToken: string): Observable<ApiResponse<LoginResponseData>> {
    return this.http.post<ApiResponse<LoginResponseData>>(`${this.apiUrl}/google-signup`, { idToken })
      .pipe(tap(response => { if (response.success && response.data) this.setFinalSession(response.data.token); }));
  }
  public verifyEmail(userId: string, token: string): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('userId', userId).set('token', token);
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/verify-email`, { params });
  }
  public resendVerificationEmail(email: string): Observable<ApiResponse<object>> {
    return this.http.post<ApiResponse<object>>(`${this.apiUrl}/resend-verification`, { email });
  }
  public setPassword(dto: SetPasswordDto): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/set-password`, dto);
  }

  private handleOtpSuccess(data: GoogleLoginResponse) {
    const rememberMe = true;
    if (data.requiresSelection) {
      this.storeAccessToken(data.token!, 'temp_token', rememberMe);
      this.router.navigate(['/workspace-selection'], { state: { tenants: data.tenants } });
    } else {
      this.setFinalSession(data.token!, rememberMe);
    }
  }

  public navigateBasedOnRole(): void {
    // Check user branches first
    this.getUserBranches().subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.length > 0) {
          const activeId = this.getActiveBranchId();
          if (res.data.length === 1) {
            // Auto-select the only branch if none selected
            if (!activeId) {
              this.setActiveBranch(res.data[0].id);
            }
            this.router.navigate(['/dashboard']);
          } else {
            // Check if active branch is valid
            const isValid = activeId ? res.data.some(b => b.id === activeId) : false;
            if (isValid) {
              this.router.navigate(['/dashboard']);
            } else {
              // Need to select a branch
              this.router.navigate(['/branch-selection'], { state: { branches: res.data } });
            }
          }
        } else {
          // No branches found for user. Let them into dashboard but they might see errors.
          this.router.navigate(['/dashboard']);
        }
      },
      error: () => {
        // Fallback
        this.router.navigate(['/dashboard']);
      }
    });
  }

  public getUserRole(): string | null {
    if (!this.isPlatformBrowser()) return null;
    return localStorage.getItem('user_role') || sessionStorage.getItem('user_role');
  }

  /**
   * Fetches the list of URLs this user is currently allowed to access.
   * Used to pre-check the boxes in the Permission Dialog.
   */
  public getUserPermissions(userId: number): Observable<ApiResponse<string[]>> {
    // Matches GET api/Users/{id}/permissions
    return this.http.get<ApiResponse<string[]>>(`${this.usersApiUrl}/${userId}/permissions`);
  }
}