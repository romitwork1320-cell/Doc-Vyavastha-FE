import { BreakpointObserver, MediaMatcher } from '@angular/cdk/layout';
import { Component, inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { MatSidenav, MatSidenavContent } from '@angular/material/sidenav';
import { CoreService } from 'src/app/services/core.service';
import { AppSettings } from 'src/app/config';
import { filter, takeUntil } from 'rxjs/operators';
import { NavigationEnd, Router } from '@angular/router';
import { NavService } from '../../services/nav.service';
import { AppNavItemComponent } from './vertical/sidebar/nav-item/nav-item.component';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './vertical/sidebar/sidebar.component';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { HeaderComponent } from './vertical/header/header.component';
import { AppHorizontalHeaderComponent } from './horizontal/header/header.component';
import { AppHorizontalSidebarComponent } from './horizontal/sidebar/sidebar.component';
import { AppBreadcrumbComponent } from './shared/breadcrumb/breadcrumb.component';
import { CustomizerComponent } from './shared/customizer/customizer.component';
import { NavItem } from './vertical/sidebar/nav-item/nav-item';
import { AuthService } from 'src/app/services/auth.service';
import { FullProfileDto, ProfileService } from 'src/app/services/profile.service';
import { navItems } from './vertical/sidebar/sidebar-data';

const MOBILE_VIEW = 'screen and (max-width: 768px)';
const TABLET_VIEW = 'screen and (min-width: 769px) and (max-width: 1024px)';
const MONITOR_VIEW = 'screen and (min-width: 1024px)';
const BELOWMONITOR = 'screen and (max-width: 1023px)';

// for mobile app sidebar
interface apps {
  id: number;
  color: string;
  icon: string;
  title: string;
  subtitle: string;
  link: string;
}


@Component({
  selector: 'app-full',
  standalone: true,
  imports: [
    RouterModule,
    AppNavItemComponent,
    MaterialModule,
    CommonModule,
    SidebarComponent,
    NgScrollbarModule,
    TablerIconsModule,
    HeaderComponent,
    AppHorizontalHeaderComponent,
    AppHorizontalSidebarComponent,
    AppBreadcrumbComponent,
    CustomizerComponent,
  ],
  templateUrl: './full.component.html',
  styleUrls: [],
  encapsulation: ViewEncapsulation.None,
})
export class FullComponent implements OnInit {
  public profileData: FullProfileDto | null = null;
  navItems = navItems;

  @ViewChild('leftsidenav')
  public sidenav: MatSidenav;
  resView = false;
  @ViewChild('content', { static: true }) content!: MatSidenavContent;
  //get options from service
  options = this.settings.getOptions();
  private layoutChangesSubscription = Subscription.EMPTY;
  private isMobileScreen = false;
  private isContentWidthFixed = true;
  private isCollapsedWidthFixed = false;
  private htmlElement!: HTMLHtmlElement;

  get isOver(): boolean {
    return this.isMobileScreen;
  }

  get isTablet(): boolean {
    return this.resView;
  }

  // for mobile app sidebar
  apps: apps[] = [
    {
      id: 1,
      icon: 'solar:chat-line-line-duotone',
      color: 'primary',
      title: 'Chat Application',
      subtitle: 'Messages & Emails',
      link: '/apps/chat',
    },
    {
      id: 2,
      icon: 'solar:checklist-minimalistic-line-duotone',
      color: 'accent',
      title: 'Todo App',
      subtitle: 'Completed task',
      link: '/apps/todo',
    },
    {
      id: 3,
      icon: 'solar:bill-list-line-duotone',
      color: 'success',
      title: 'Invoice App',
      subtitle: 'Get latest invoice',
      link: '/apps/invoice',
    },
    {
      id: 4,
      icon: 'solar:calendar-line-duotone',
      color: 'error',
      title: 'Calendar App',
      subtitle: 'Get Dates',
      link: '/apps/calendar',
    },
    {
      id: 5,
      icon: 'solar:smartphone-2-line-duotone',
      color: 'warning',
      title: 'Contact Application',
      subtitle: '2 Unsaved Contacts',
      link: '/apps/contacts',
    },
    {
      id: 6,
      icon: 'solar:ticket-line-duotone',
      color: 'primary',
      title: 'Tickets App',
      subtitle: 'Create new ticket',
      link: '/apps/tickets',
    },
    {
      id: 7,
      icon: 'solar:letter-line-duotone',
      color: 'accent',
      title: 'Email App',
      subtitle: 'Get new emails',
      link: '/apps/email/inbox',
    },
    {
      id: 8,
      icon: 'solar:book-2-line-duotone',
      color: 'warning',
      title: 'Courses',
      subtitle: 'Create new course',
      link: '/apps/courses',
    },
  ]

  accessibleNavItems: NavItem[] = [];
  private destroy$ = new Subject<void>();

  
  constructor(
    private settings: CoreService,
    private mediaMatcher: MediaMatcher,
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private navService: NavService,
    private authService: AuthService,
    private profileService: ProfileService
  ) {
    this.htmlElement = document.querySelector('html')!;
    this.layoutChangesSubscription = this.breakpointObserver
      .observe([MOBILE_VIEW, TABLET_VIEW, MONITOR_VIEW, BELOWMONITOR])
      .subscribe((state) => {
        // SidenavOpened must be reset true when layout changes
        this.options.sidenavOpened = true;
        this.isMobileScreen = state.breakpoints[BELOWMONITOR];
        if (this.options.sidenavCollapsed == false) {
          this.options.sidenavCollapsed = state.breakpoints[TABLET_VIEW];
        }
        this.isContentWidthFixed = state.breakpoints[MONITOR_VIEW];
        this.resView = state.breakpoints[BELOWMONITOR];
      });

    // Initialize project theme with options
    this.receiveOptions(this.options);

    // This is for scroll to top
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((e) => {
        this.content.scrollTo({ top: 0 });
      });
  }

  ngOnInit(): void {

    // Listen to real-time permission updates and filter the sidebar
    this.authService.permissions$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.buildAccessibleNavItems();
    });
  }

  private buildAccessibleNavItems(): void {
    if (this.authService.getUserRole() === 'SuperAdmin') {
      this.accessibleNavItems = [
        { navCap: 'Super Admin', iconName: 'shield' },
        { displayName: 'Dashboard', iconName: 'layout-dashboard', route: '/super-admin/dashboard' },
        { displayName: 'Organization Types', iconName: 'building', route: '/super-admin/organization-types' },
        { displayName: 'Document Types', iconName: 'files', route: '/super-admin/document-types' },
        { displayName: 'Templates', iconName: 'file-text', route: '/super-admin/templates' },
        { displayName: 'Settings', iconName: 'settings', route: '/settings' },
      ];
      return;
    }

    const filtered: NavItem[] = [];
    let pendingNavCap: NavItem | null = null;

    for (const item of this.navItems) {
      if (item.navCap === 'Administration' && this.authService.isOrganization()) {
        filtered.push(item);
        continue;
      }

      if (item.navCap) {
        // Hold onto the header. We only add it if a child item is accessible.
        pendingNavCap = item;
      } else if (item.route) {
        // Hide Client-only routes from Organizations
        if ((item.route === '/dashboard/client-organizations' || item.route === '/dashboard/document-vault') && this.authService.isOrganization()) {
          continue;
        }
        
        // Hide Organization-only routes from Clients
        if (item.route === '/dashboard/clients' && this.authService.getUserRole() === 'Client') {
          continue;
        }

        // Check if the user has CanView permission for this route
        if (this.authService.hasPermission(item.route, 'CanView')) {
          if (pendingNavCap) {
            filtered.push(pendingNavCap);
            pendingNavCap = null;
          }
          filtered.push(item);
        }
      } else {
        // Other items (external links, dividers, etc.)
        if (pendingNavCap) {
          filtered.push(pendingNavCap);
          pendingNavCap = null;
        }
        filtered.push(item);
      }
    }
    
    this.accessibleNavItems = filtered;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.layoutChangesSubscription.unsubscribe();
  }

  toggleCollapsed() {
    this.isContentWidthFixed = false;
    this.options.sidenavCollapsed = !this.options.sidenavCollapsed;
    this.resetCollapsedState();
  }

  resetCollapsedState(timer = 400) {
    setTimeout(() => this.settings.setOptions(this.options), timer);
  }

  onSidenavClosedStart() {
    this.isContentWidthFixed = false;
  }

  onSidenavOpenedChange(isOpened: boolean) {
    this.isCollapsedWidthFixed = !this.isOver;
    this.options.sidenavOpened = isOpened;
    this.settings.setOptions(this.options);
  }

  receiveOptions(options: AppSettings): void {
    this.options = options;
    this.toggleDarkTheme(options);
  }

  toggleDarkTheme(options: AppSettings) {
    if (options.theme === 'dark') {
      this.htmlElement.classList.add('dark-theme');
      this.htmlElement.classList.remove('light-theme');
    } else {
      this.htmlElement.classList.remove('dark-theme');
      this.htmlElement.classList.add('light-theme');
    }
  }
}
