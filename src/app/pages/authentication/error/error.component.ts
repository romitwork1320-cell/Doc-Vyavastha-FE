import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '../../../material.module';
// Adjust the path if your AuthService is in a different folder
import { AuthService } from 'src/app/services/auth.service'; 

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [RouterModule, MaterialModule],
  templateUrl: './error.component.html',
})
export class AppErrorComponent {

  constructor(private authService: AuthService, private router: Router) {}

  goBack(): void {
    // ✨ FIX: Log out the user to clear the invalid/unauthorized session
    this.authService.logout();
    
    // The logout method in your service usually handles navigation to '/login',
    // but we can add this just in case.
    this.router.navigate(['/login']);
  }
}