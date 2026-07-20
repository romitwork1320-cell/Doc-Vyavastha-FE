import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export const RoleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const snackBar = inject(MatSnackBar);

  // 1. Get the current user's role from your AuthService
  const userRole = authService.getUserRole();
  const routeUrl = state.url.split('?')[0];

  // 2. If the user is Admin or Owner, allow access immediately
  if (userRole === 'Admin' || userRole === 'Owner') {
    return true;
  }

  // 3. Get the required module name from route data (if provided) or fallback to url path
  // E.g., data: { permissionUrl: '/students' }
  const permissionUrl = route.data['permissionUrl'] || routeUrl;

  // 4. Check if they have CanView for this URL
  if (authService.hasPermission(permissionUrl, 'CanView')) {
    return true;
  }

  // 5. Access Denied Logic
  snackBar.open('Access Denied: You do not have permission to view this page.', 'Close', { duration: 3000 });
  
  router.navigate(['/dashboard']);
  
  return false;
};