import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService, ApiResponse, TokenResponseData } from './services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    
    // 1. Enable credentials (cookies) for Refresh Token
    request = request.clone({
      withCredentials: true
    });

    // 2. Skip logic for Public Endpoints
    if (request.url.includes('/login') || request.url.includes('/refresh') || request.url.includes('/google-login')) {
        return next.handle(request);
    }
    
    // 3. ✨ CRITICAL FIX: Retrieve Token (Access OR Temp)
    // The service's getAccessToken() checks both Local and Session storage.
    let token = this.authService.getAccessToken();

    // If no access token, check for a 'temp_token' (Used during Workspace Selection)
    if (!token) {
       token = localStorage.getItem('temp_token') || sessionStorage.getItem('temp_token');
    }

    if (token) {
      request = this.addToken(request, token);
    }

    const branchId = this.authService.getActiveBranchId();
    if (branchId) {
      request = request.clone({
        setHeaders: {
          'X-Branch-ID': branchId
        }
      });
    }

    return next.handle(request).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {

          // 4. Prevent loops: Do not attempt to refresh if these fail
          // Added '/select-tenant' because temp_tokens cannot be refreshed.
          if (request.url.includes('/login') || 
              request.url.includes('/google-login') || 
              request.url.includes('/refresh') ||
              request.url.includes('/select-tenant') ||
              request.url.includes('/logout')) {
            return throwError(() => error);
          }
          
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private addToken(request: HttpRequest<any>, token: string) {
    return request.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true 
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((response: ApiResponse<TokenResponseData>) => {
          this.isRefreshing = false;
          
          if (response.success && response.data) {
            this.refreshTokenSubject.next(response.data.accessToken);
            return next.handle(this.addToken(request, response.data.accessToken));
          }
          
          this.authService.logout();
          return throwError(() => new Error('Session expired.'));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.authService.logout();
          return throwError(() => err);
        })
      );

    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(jwt => next.handle(this.addToken(request, jwt)))
      );
    }
  }
}