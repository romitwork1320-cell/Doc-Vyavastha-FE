import { Component, OnInit, OnDestroy } from '@angular/core'; 
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { FabClickService } from './services/fab-click.service';
import { AuthService } from './services/auth.service';
import { SignalRService } from './services/signalr.service'; 
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subscription, filter } from 'rxjs'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TablerIconsModule
  ],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Modernize Angular Admin Template';
  isLoggedIn$ = this.authService.isLoggedIn$;
  
  // ✅ Track subscription to prevent memory leaks
  private authSubscription: Subscription = new Subscription();

  constructor(
    public fabClickService: FabClickService,
    private authService: AuthService,
    private signalRService: SignalRService, // ✅ Inject SignalRService
    private router: Router
  ) {}

  ngOnInit(): void {
    // 1. Attempt Auto Login (Keep existing logic)
    this.authService.attemptAutoLogin().subscribe();

    // 2. ✅ Subscribe to Login Status
    // This handles both "Page Refresh" (if auto-login works) AND "User Login/Logout" events
    this.authSubscription = this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.signalRService.startConnection();
      } else {
        this.signalRService.stopConnection();
      }
    });
    
    // ✅ 3. Refresh permissions on every navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.authService.refreshPermissions();
    });
  }

  // ✅ Clean up when the app is destroyed
  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
  }
}