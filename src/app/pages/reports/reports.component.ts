import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import { delay, filter, map, startWith, Subject, switchMap, takeUntil } from 'rxjs';
import { GlobalSearchService } from 'src/app/services/global-search.service';
import { PageTitleService } from 'src/app/services/page-title.service';
import { FabClickService, FabMenuItem } from 'src/app/services/fab-click.service';
import { AuthService } from 'src/app/services/auth.service'; //

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    TablerIconsModule,
    RouterLink,
    RouterOutlet
  ]
})
export class ReportsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private globalSearchService = inject(GlobalSearchService);
  private pageTitleService = inject(PageTitleService);
  private fabClickService = inject(FabClickService);
  private authService = inject(AuthService); // Inject AuthService

  // Define ALL possible items here
  private allReportMenuItems: FabMenuItem[] = [
    { id: 'service-center', name: 'Service Center', icon: 'tools', route: '/reports/service-center' },
    { id: 'customer-replacement', name: 'Customer Replacement', icon: 'replace', route: '/reports/customer-replacement' }
  ];

  // This array will be populated based on the role
  reportMenuItems: FabMenuItem[] = [];

  ngOnInit(): void {
    // --- 1. FILTER MENU ITEMS BASED ON ROLE ---
    const role = this.authService.getUserRole(); //

    if (role === 'Field Executive') {
      // Field Executive: ONLY sees Service Center
      this.reportMenuItems = this.allReportMenuItems.filter(item => item.id === 'service-center');
    } else {
      // Admin/Owner: Sees everything
      this.reportMenuItems = [...this.allReportMenuItems];
    }

    // --- 2. LISTEN FOR CLICKS ---
    this.fabClickService.menuItemClick$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(menuItem => {
      const route = this.reportMenuItems.find(m => m.id === menuItem.id)?.route;
      if (route) {
        this.router.navigate([route]);
      }
    });

    // --- 3. HEADER & FAB SETUP ---
    this.router.events.pipe(
      startWith(null), 
      filter(event => event === null || event instanceof NavigationEnd),
      delay(0), 
      map(() => this.activatedRoute.firstChild),
      filter((route): route is ActivatedRoute => route !== null),
      switchMap(route => route.data),
      takeUntil(this.destroy$)
    ).subscribe(data => {
      
      this.fabClickService.show({
        icon: 'list', 
        menu: this.reportMenuItems // Use the filtered list here
      });

      if (data && data['title']) {
        this.pageTitleService.setTitle(data['title']);
      } else {
        this.pageTitleService.setTitle('Reports');
      }
      
      if (data && data['searchPlaceholder']) {
        this.globalSearchService.show(data['searchPlaceholder']);
      } else {
        this.globalSearchService.hide();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.globalSearchService.hide();
    this.fabClickService.hide();
  }
}