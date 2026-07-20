import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

/**
 * Protects the authenticated shell: requires a valid access token (issued by
 * EDConsultancy-BE on login). Unauthenticated users are sent to /login.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.auth.getAccessToken()) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}
