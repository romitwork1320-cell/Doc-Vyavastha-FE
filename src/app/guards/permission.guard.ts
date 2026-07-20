import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

/**
 * DEV MODE: Permission guard bypassed for frontend-only development with dummy data.
 * Restore original logic when connecting to the real SmartCRM backend.
 */
@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {
  canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
    return true; // DEV BYPASS
  }
}