import { Injectable, Inject, PLATFORM_ID, NgZone } from '@angular/core';
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

export interface WorkspaceSelection {
  tenantId: number | null;
  workspaceType: string;
  tenantName: string;
  role: string;
  isActive: boolean;
}

export interface AuthResponse {
  nextStep: string;
  accessToken?: string;
  tempToken?: string;
  refreshToken?: string;
  workspaces?: WorkspaceSelection[];
  currentWorkspace?: WorkspaceSelection;
}

export interface RegisterIdentityRequest {
  email: string;
  password?: string;
}

export interface CreateWorkspaceRequest {
  workspaceType: 'PERSONAL' | 'ORGANIZATION';
  name: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  orgType?: string;
  orgTypeId?: number;
}

export interface TokenResponseData {
  accessToken: string;
  refreshToken?: string;
}

export interface DecodedToken {
  permissions: PagePermission[];
  exp: number;
  TenantId: string;
  role: string;
  UserId: string;
  workspace_type?: string;
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
  tenantId: number | null;
  workspaceType: string;
  rememberMe: boolean;
}

export interface SendOtpRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otpCode: string;
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
    private zone: NgZone,
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
    return this.http.get<ApiResponse<PagePermission[]>>(`${this.usersApiUrl}/${userId}/permissions`, {
      headers: { 'X-Skip-Interceptor': 'true' }
    }).pipe(
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
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/UserBranches/me`, {
      headers: { 'X-Skip-Interceptor': 'true' }
    });
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

  public isOrganization(): boolean {
    if (!this.isPlatformBrowser()) return false;
    const token = this.getAccessToken();
    if (!token) return false;
    try {
      const decoded: DecodedToken = jwtDecode(token);
      return decoded.role !== 'Client' && decoded.role !== 'SuperAdmin' && decoded.TenantId !== '0' && !!decoded.TenantId;
    } catch (e) {
      return false;
    }
  }

  // --- 2. AUTH METHODS ---

  public sendLoginOtp(email: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/send-otp`, { email });
  }

  public verifyLoginOtp(data: VerifyOtpRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/verify-otp`, data)
      .pipe(tap(res => this.handleAuthResponse(res, true)));
  }

  public registerIdentity(data: RegisterIdentityRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register-identity`, data)
      .pipe(tap(res => this.handleAuthResponse(res, true)));
  }

  public createWorkspace(data: CreateWorkspaceRequest): Observable<ApiResponse<AuthResponse>> {
    // Requires sending the temp token. Handled by interceptor if stored in temp_token.
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/create-workspace`, data)
      .pipe(tap(res => this.handleAuthResponse(res, true)));
  }

  public getOrganizationTypes(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/organization-types`).pipe(
      map(res => ({
        success: res.success,
        statusCode: res.statusCode,
        message: res.message,
        data: (res.data || []).map((d: any) => ({
          id: d.ID,
          name: d.Name,
          description: d.Description
        }))
      }))
    );
  }

  public login(email: string, password: string, rememberMe: boolean): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, { email, password, rememberMe }).pipe(
      tap(response => this.handleAuthResponse(response, rememberMe))
    );
  }

  public loginSilent(email: string, password: string, rememberMe: boolean): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, { email, password, rememberMe });
  }

  public loginWithGoogle(idToken: string, rememberMe: boolean): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/google-login`, { idToken, rememberMe }).pipe(
      tap(response => this.handleAuthResponse(response, rememberMe))
    );
  }

  public selectTenant(tenantId: number | null, workspaceType: string): Observable<ApiResponse<AuthResponse>> {
    const isRemembered = localStorage.getItem('access_token') !== null;

    const payload: SelectTenantRequest = {
      tenantId: tenantId,
      workspaceType: workspaceType,
      rememberMe: isRemembered
    };

    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/select-tenant`, payload)
      .pipe(
        tap(response => this.handleAuthResponse(response, isRemembered))
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

  public handleAuthResponse(response: ApiResponse<AuthResponse>, rememberMe: boolean = false): void {
    if (!response.success || !response.data) return;

    const nextStep = response.data.nextStep;

    if (nextStep === 'CREATE_WORKSPACE') {
      if (response.data.tempToken) {
        this.storeAccessToken(response.data.tempToken, 'temp_token', rememberMe);
      }
      this.router.navigate(['/workspaces'], { state: { action: 'create' } });
    } else if (nextStep === 'SELECT_WORKSPACE') {
      if (response.data.tempToken) {
        this.storeAccessToken(response.data.tempToken, 'temp_token', rememberMe);
      }
      this.router.navigate(['/workspaces'], { state: { workspaces: response.data.workspaces } });
    } else if (nextStep === 'ENTER_WORKSPACE' || nextStep === 'DONE') {
      if (response.data.accessToken) {
        this.setFinalSession(response.data.accessToken, rememberMe);
      }
    }
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
      this.zone.run(() => {
        this.navigateBasedOnRole();
      });
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

    // Allow Clients to view their own dashboard and profile
    if (role === 'Client') {
      const url = requestedUrl.toLowerCase();
      if (
        url === '/dashboard' || 
        url === '/dashboard/client-organizations' || 
        url === '/dashboard/document-vault' || 
        url === '/dashboard/applications' || 
        url === '/my-profile' || 
        url === '/settings' || 
        url === '/support'
      ) {
        return true;
      }
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



  public navigateBasedOnRole(): void {
    if (!this.isPlatformBrowser()) return;
    const tenantId = localStorage.getItem('tenant_id') || sessionStorage.getItem('tenant_id');
    const userRole = this.getUserRole();

    if (userRole === 'SuperAdmin') {
      this.router.navigate(['/super-admin/dashboard']);
      return;
    }

    // If no tenant is selected, user needs to select a workspace.
    // Note: tenantId '0' is valid for Personal Workspaces!
    if (!tenantId || tenantId === 'undefined') {
      this.router.navigate(['/workspaces']);
    } else {
      this.router.navigate(['/dashboard']);
    }
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
    return this.http.get<ApiResponse<string[]>>(`${this.usersApiUrl}/${userId}/permissions`, {
      headers: { 'X-Skip-Interceptor': 'true' }
    });
  }



}
