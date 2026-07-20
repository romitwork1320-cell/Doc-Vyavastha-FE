import {
  Component,
  Output,
  EventEmitter,
  Input,
  ViewEncapsulation,
  OnInit,
  ElementRef,
  ViewChild,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { CoreService } from 'src/app/services/core.service';
import { MatDialog } from '@angular/material/dialog';
import { navItems } from '../sidebar/sidebar-data';
import { TranslateService } from '@ngx-translate/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { ActivatedRoute, NavigationEnd, Router, RouterModule, Event as RouterEvent } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { AuthService } from 'src/app/services/auth.service';
import { jwtDecode } from 'jwt-decode';
import { debounceTime, delay, distinctUntilChanged, filter, map, Observable, startWith, Subject, Subscription, switchMap, takeUntil, tap } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { GlobalSearchDto, GlobalSearchService } from 'src/app/services/global-search.service';
import { PageTitleService } from 'src/app/services/page-title.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GlobalImportExportService } from 'src/app/services/global-import-export.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FabClickService } from 'src/app/services/fab-click.service';
import { GlobalFilterService } from 'src/app/services/global-filter.service';
import { PaginationRequestDto } from 'src/app/common/interfaces/common';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { ReplacePipe } from 'src/app/common/replace.pipe';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReplacementProductService } from 'src/app/services/replacement-product.service';
import { DialogData, ReplacementProductDialogComponent } from 'src/app/pages/replacement-products/replacement-product-dialog/replacement-product-dialog.component';
import { ContactService, ContactUpdateDto } from 'src/app/services/contacts.service';
import { ProductService, ProductUpdateDto } from 'src/app/services/products.service';
import { ProductDialogComponent, DialogData as ProductDialogData } from 'src/app/pages/products/product-dialog/product-dialog.component';
import { ServiceCentersService, ServiceCenterUpdateDto } from 'src/app/services/service-centers.service';
import { ServiceCenterDialogComponent, DialogData as ServiceCenterDialogData } from 'src/app/pages/service-centers/service-center-dialog/service-center-dialog.component';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { ProductHistoryDialogComponent } from 'src/app/pages/products/product-history-dialog/product-history-dialog.component';
import { ServiceCenterHistoryDialogComponent } from 'src/app/pages/service-centers/service-center-history-dialog/service-center-history-dialog.component';
import { MatMenuModule } from '@angular/material/menu';
import { NotificationDto, NotificationService } from 'src/app/services/notification.service';

interface notifications {
  id: number;
  icon: string;
  color: string;
  title: string;
  time: string;
  subtitle: string;
}

interface profiledd {
  id: number;
  title: string;
  link?: string;
  new?: boolean;
}

interface apps {
  id: number;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  link: string;
}

interface SearchGroup {
  category: string;
  items: GlobalSearchDto[];
}

interface SearchGroup {
  category: string;
  items: GlobalSearchDto[];
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    NgScrollbarModule,
    TablerIconsModule,
    MaterialModule,
    FormsModule, 
    ReactiveFormsModule,
    MatFormFieldModule, 
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatAutocompleteModule,
    ReplacePipe,
    MatMenuModule
  ],
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() showToggle = true;
  @Input() toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleMobileFilterNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();

  userName: string = 'User';
  userRole: string = 'Role';

  companyLogoUrl$: Observable<string>;
  
  showFiller = false;

  private destroy$ = new Subject<void>();

  public isSearchOpen = false; 
  private isSearchAvailable = false;
  searchQuery: string = '';
  searchControl = new FormControl(''); 
  
  // --- IMPORTANT: State Management Variables ---
  private lastSearchInput: string = ''; // Stores the actual text typed ("watch")
  private isSelectionMode = false;      // Flag to block valueChanges during selection

  // API Results
  searchResults: GlobalSearchDto[] = [];
  isSearchLoading = false;

  private searchSubscription: Subscription;
  private showSearchSubscription: Subscription;

  public filterMenu: MatMenuModule | null = null;

  searchGroups: SearchGroup[] = [];

  unreadNotifications: NotificationDto[] = [];
  unreadCount: number = 0;

  @ViewChild('searchInput') searchInput: ElementRef<HTMLInputElement>;
  @ViewChild(MatAutocompleteTrigger) autocompleteTrigger: MatAutocompleteTrigger;
  
  public selectedLanguage: any = {
    language: 'English',
    code: 'en',
    type: 'US',
    icon: '/assets/images/flag/icon-flag-en.svg',
  };

  public languages: any[] = [
    {
      language: 'English',
      code: 'en',
      type: 'US',
      icon: '/assets/images/flag/icon-flag-en.svg',
    },
    {
      language: 'Español',
      code: 'es',
      icon: '/assets/images/flag/icon-flag-es.svg',
    },
    {
      language: 'Français',
      code: 'fr',
      icon: '/assets/images/flag/icon-flag-fr.svg',
    },
    {
      language: 'German',
      code: 'de',
      icon: '/assets/images/flag/icon-flag-de.svg',
    },
  ];

  private currentUrl: string = '';
  isSubscriptionActive: boolean = true;
  daysRemaining: number = 30; 
  private subStatusSubscription: Subscription;
  private daysRemainingSubscription: Subscription;
  currentTenantId: number = 0;

  // --- Branch Switcher Properties ---
  branches: any[] = [];
  activeBranchId: string | null = null;


  constructor(
    private settings: CoreService,
    private vsidenav: CoreService,
    public dialog: MatDialog,
    private translate: TranslateService,
    private authService: AuthService, 
    private router: Router, 
    private activatedRoute: ActivatedRoute,
    private profileService: ProfileService,
    public globalSearchService: GlobalSearchService,
    public pageTitleService: PageTitleService,
    public globalImportExportService: GlobalImportExportService,
    private fabClickService: FabClickService,
    public globalFilterService: GlobalFilterService,
    private replacementProductService: ReplacementProductService,
    private contactService: ContactService,
    private snackBar: MatSnackBar,
    private productService: ProductService,
    private serviceCentersService: ServiceCentersService,
    private subService: SubscriptionService,
    private notificationService: NotificationService,
  ) {
    translate.setDefaultLang('en');
    this.companyLogoUrl$ = this.profileService.companyLogoUrl$;
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    const isInput = target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea';

    if (
      event.key.toLowerCase() === 'r' &&
      !isInput &&
      this.isSearchAvailable &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      event.preventDefault(); 
      this.searchInput.nativeElement.focus(); 
    }
    else if (event.key === 'Escape' && this.isSearchOpen) {
      this.searchInput.nativeElement.blur(); 
    }
  }

  ngOnInit(): void {
    try {
      const token = this.authService.getAccessToken();
      if (token) {
        const decodedToken: any = jwtDecode(token);
        this.userName = decodedToken.unique_name || 'User';
        this.userRole = decodedToken.role || 'Role';

        this.currentTenantId = Number(decodedToken.TenantId || decodedToken.tenantId || decodedToken.tid || 0);
        
        if (this.currentTenantId > 0) {
          this.subService.checkSubscriptionStatus(this.currentTenantId);
        }

        this.currentTenantId = Number(decodedToken.TenantId || decodedToken.tenantId || decodedToken.tid || 0);
        
        if (this.currentTenantId > 0) {
          this.subService.checkSubscriptionStatus(this.currentTenantId);
        }
      }
    } catch (error) {
      console.error("Error decoding token:", error);
    }

    // Try to load the user's actual first name from their profile
    this.profileService.getProfile().subscribe({
      next: (res) => {
        if (res.success && res.data?.userProfile?.firstName) {
          this.userName = res.data.userProfile.firstName;
        }
      },
      error: (err) => console.error("Error loading profile for header:", err)
    });

    this.subStatusSubscription = this.subService.isSubscriptionActive$.subscribe(isActive => {
      this.isSubscriptionActive = isActive;
    });

    this.daysRemainingSubscription = this.subService.daysRemaining$.subscribe(days => {
      this.daysRemaining = days;
    });

    this.currentUrl = this.router.url;

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd), 
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      this.currentUrl = event.urlAfterRedirects;
    });

    this.router.events.pipe(
      startWith(null),
      filter((event): event is NavigationEnd => event === null || event instanceof NavigationEnd),
      delay(0),
      map(() => this.router.routerState.root),
      map(route => {
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route;
      }),
      filter(route => route.outlet === 'primary'),
      switchMap(route => route.data),
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.setupHeaderFromData(data || {});
    });

    this.showSearchSubscription = this.globalSearchService.showSearch$.subscribe(
      (show) => {
        this.isSearchAvailable = show;
        if (!show && this.isSearchOpen) {
          this.isSearchOpen = false;
        }
      }
    );

    this.searchSubscription = this.globalSearchService.searchQuery$.subscribe(
      (query) => {
        if (this.searchControl.value !== query) {
          this.searchControl.setValue(query, { emitEvent: false });
        }
      }
    );

    // --- CRITICAL FIX: SEARCH LOGIC ---
    this.searchControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(400),
      distinctUntilChanged(),
      tap((value) => {
         // 1. If we are currently selecting an option, IGNORE everything.
         if (this.isSelectionMode) return; 

         // 2. Only update 'lastSearchInput' if user is actually typing (value is string)
         if (typeof value === 'string') {
            this.lastSearchInput = value;
            
            if (value.length < 3) {
              this.searchGroups = []; // Clear the dropdown list
              this.searchResults = [];
              this.isSearchLoading = false;
              this.autocompleteTrigger.closePanel(); // Close the panel
            } else {
              this.isSearchLoading = true;
            }
         }
      }),
      switchMap(value => {
        // 3. Stop processing if selecting, or value is not string, or too short
        if (this.isSelectionMode || !value || typeof value !== 'string' || value.length < 3) {
          return []; 
        }

        const request: PaginationRequestDto = {
          pageIndex: 0,
          pageSize: 15,
          filter: value
        };

        return this.globalSearchService.searchFromApi(request);
      })
    ).subscribe({
        next: (response) => {
          // If we are in selection mode, ignore results to prevent race condition
          if (this.isSelectionMode) {
             this.isSearchLoading = false;
             return;
          }

          this.isSearchLoading = false;
          
          if (Array.isArray(response)) {
             // Only clear dropdown if the user actually cleared the input
             if (!this.lastSearchInput || this.lastSearchInput.length < 3) {
                 this.searchGroups = [];
             }
          } else if (response && response.success) {
             this.processSearchResults(response.data || []);
          } else {
             this.searchGroups = [];
          }
      },
      error: (err) => {
        this.isSearchLoading = false;
        console.error('Global search error', err);
        this.searchGroups = []; 
      }
    });

    this.notificationService.loadUnreadNotifications();
    
    // Subscribe to state changes to drive the UI Badge
    this.notificationService.unreadNotifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifs => {
        this.unreadNotifications = notifs;
        this.unreadCount = notifs.length;
    });

    // --- Branch Switcher Logic ---
    this.authService.activeBranchId$.pipe(takeUntil(this.destroy$)).subscribe(id => {
      this.activeBranchId = id;
    });

    this.authService.getUserBranches().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.branches = res.data;
          
          if (this.branches.length === 1) {
            this.authService.setActiveBranch(this.branches[0].id);
          } else if (this.branches.length > 1) {
             const savedBranchId = this.authService.getActiveBranchId();
             const branchExists = this.branches.find(b => b.id === savedBranchId);
             
             if (!branchExists) {
                 // Fallback to first branch if saved doesn't exist
                 this.authService.setActiveBranch(this.branches[0].id);
             }
          }
        }
      }
    });
  }

  onBranchChange(branchId: string): void {
    this.authService.setActiveBranch(branchId);
  }

  

  onNotificationClick(notification: NotificationDto, event: MouseEvent): void {
    // ✨ FIX 1: Removed event.stopPropagation(); so the menu closes automatically when clicked!
    
    // 1. Mark as read in DB and update local badge
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        // Success handled internally
      },
      error: (err) => {
        console.error('Failed to mark notification as read', err);
      }
    });

    // 2. Navigate based on Type or ReferenceId
    if (notification.referenceId) {
      this.router.navigate(['/support', notification.referenceId]);
    }
  }

  // --- REFRESH HELPER: Bypasses valueChanges ---
  // 1. Restores the text to the input (VISUAL FIX)
  // 2. Triggers the API call (DATA FIX)
  private refreshSearchResults(): void {
    if (this.lastSearchInput && this.lastSearchInput.length >= 3) {
        
        // --- CRITICAL FIX: Put the text back in the box ---
        this.searchControl.setValue(this.lastSearchInput, { emitEvent: false });

        this.isSearchLoading = true;
        
        const request: PaginationRequestDto = {
          pageIndex: 0, pageSize: 15, filter: this.lastSearchInput
        };

        // Call API Directly
        this.globalSearchService.searchFromApi(request).subscribe({
            next: (response) => {
                this.isSearchLoading = false;
                if (response && response.success) {
                    this.processSearchResults(response.data || []);
                }
            },
            error: () => {
                this.isSearchLoading = false;
            }
        });
    }
  }

  private processSearchResults(flatData: GlobalSearchDto[]): void {
     const contacts = flatData.filter(x => x.category === 'Contact');
     const replacements = flatData.filter(x => x.category === 'Replacement');
     const products = flatData.filter(x => x.category === 'Product');
     const centers = flatData.filter(x => x.category === 'ServiceCenter');
     
     let groups: SearchGroup[] = [];
     
     if (contacts.length > 0) groups.push({ category: 'Contacts', items: contacts });
     if (products.length > 0) groups.push({ category: 'Products', items: products });
     if (replacements.length > 0) groups.push({ category: 'Replacements', items: replacements });
     if (centers.length > 0) groups.push({ category: 'Service Centers', items: centers });

     this.searchGroups = this.sortGroupsBasedOnRoute(groups);
  }

  private sortGroupsBasedOnRoute(groups: SearchGroup[]): SearchGroup[] {
    const url = this.currentUrl.toLowerCase();
    
    const isContactPage = url.includes('/contacts') || url.includes('/contact');
    const isProductPage = url.includes('/products') || url.includes('/product');
    const isCenterPage = url.includes('/service-centers') || url.includes('/servicecenter'); 
    const isReplacementPage = url.includes('/replacements');

    return groups.sort((a, b) => {
      const catA = a.category.toLowerCase(); 
      if (isContactPage) return catA.includes('contact') ? -1 : 1;
      if (isProductPage) return catA.includes('product') ? -1 : 1;
      if (isCenterPage) return catA.includes('service') ? -1 : 1;
      if (isReplacementPage) return catA.includes('replacement') ? -1 : 1;
      
      if (catA.includes('contact')) return -1;
      if (catA.includes('product') && !b.category.toLowerCase().includes('contact')) return -1;
      return 1;
    });
  }

  // --- SELECTION HANDLER ---
  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const item: GlobalSearchDto = event.option.value;
    
    // 1. Lock pipeline
    this.isSelectionMode = true;

    // 2. Set Value immediately (keep "watch" in box)
    this.searchControl.setValue(this.lastSearchInput, { emitEvent: false });
    
    // 3. Unlock after delay and cleanup
    setTimeout(() => {
        this.searchControl.setValue(this.lastSearchInput, { emitEvent: false });
        this.isSelectionMode = false;
        
        // Close Panel & Remove Focus to avoid flickering
        this.autocompleteTrigger.closePanel();
        this.isSearchOpen = false;
        this.searchInput.nativeElement.blur();
    }, 200);

    // 4. Open Dialog
    if (item.category === 'Product') {
        this.openProductDialog(item.id);
    }
    else if (item.category === 'ServiceCenter') { 
        this.openServiceCenterDialog(item.id);
    }
    else if (item.category === 'Replacement') {
        if (item.i_W_No) {
            this.openReplacementDialog(item.i_W_No);
        }
    }
  }

  // --- DIALOG HANDLERS (Calling refreshSearchResults) ---

  openProductDialog(productId: number): void {
    const dialogRef = this.dialog.open(ProductHistoryDialogComponent, {
      width: '1200px',
      data: { productId: productId },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      this.refreshSearchResults();

      // If needed, refresh the main product grid
      if (this.router.url.includes('/products')) {
         this.globalSearchService.triggerRefresh();
      }
    });
  }

  openServiceCenterDialog(centerId: number): void {
    const dialogRef = this.dialog.open(ServiceCenterHistoryDialogComponent, {
      width: '1200px',
      data: { serviceCenterId: centerId },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      this.refreshSearchResults();

      // Refresh main grid if needed
      if (this.router.url.includes('/servicecenters')) {
         this.globalSearchService.triggerRefresh();
      }
    });
  }

  openReplacementDialog(invertNo: string): void {
    this.replacementProductService.getReplacementProductsByInvertNo(invertNo)
      .subscribe({
        next: (response) => {
          if (response.success && response.data && response.data.length > 0) {
            const product = response.data[0];
            const dialogData: DialogData = {
              action: 'Update',
              replacement: {
                id: product.id,
                invertNo: product.invertNo,
                contact: {
                  id: product.contactId ?? 0,
                  name: product.contactName || '',
                  contactNo: product.contactNo || '',
                  isActive: true,
                },
                replacedItems: [] 
              }
            };

            const dialogRef = this.dialog.open(ReplacementProductDialogComponent, {
              width: '1300px',
              data: dialogData,
              autoFocus: false
            });

            dialogRef.afterClosed().subscribe(result => {
               if (this.router.url.includes('/replacements') && result && result.event !== 'Cancel') {
                  this.globalSearchService.triggerRefresh();
               }
               // --- CRITICAL: Ensure text is restored and list refreshed ---
               this.refreshSearchResults(); 
            });
          }
        }
      });
  }

  // --- Display Function: Use Arrow Function to bind 'this' ---
  displayFn = (item: GlobalSearchDto): string => {
    // Return the text the user typed ("watch") instead of the selected object name
    return this.lastSearchInput; 
  }

  // ... (setupHeaderFromData, ngOnDestroy, etc. - No changes needed below)
  private setupHeaderFromData(data: any): void {
    if (data.title) { this.pageTitleService.setTitle(data.title); } else { this.pageTitleService.setTitle('Replezy'); }
    if (data.searchPlaceholder) { this.globalSearchService.show(data.searchPlaceholder); } else { this.globalSearchService.hide(); }
    if (data.importExport || data.customAction) { 
      this.globalImportExportService.show({ 
        import: data.importExport?.import, 
        export: data.importExport?.export, 
        trash: data.importExport?.trash, 
        customAction: data.customAction 
      }); 
    } else { 
      this.globalImportExportService.hide(); 
    }
    if (data.showFab) { 
      const permUrl = data.permissionUrl || this.router.url.split('?')[0];
      if (this.authService.hasPermission(permUrl, 'CanAdd')) {
        this.fabClickService.show({ icon: 'add' }); 
      } else {
        this.fabClickService.hide();
      }
    } else { 
      this.fabClickService.hide(); 
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.searchSubscription) this.searchSubscription.unsubscribe();
    if (this.showSearchSubscription) this.showSearchSubscription.unsubscribe();
    if (this.subStatusSubscription) this.subStatusSubscription.unsubscribe();
    if (this.daysRemainingSubscription) this.daysRemainingSubscription.unsubscribe();
  }

  onSearchFocus(): void { this.isSearchOpen = true; }

  // Update the signature to accept the event
  clearSearch(event?: Event): void {
    // 1. Stop the button click from doing default things (like stealing focus weirdly)
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    // 2. CRITICAL FIX: Manually clear the variable used by displayFn immediately.
    // This prevents the old text from popping back up when we blur.
    this.lastSearchInput = '';

    // 3. Reset the form control
    this.searchControl.setValue(''); 
    
    // 4. Clear the results arrays immediately
    this.searchGroups = []; 
    this.searchResults = []; 
    this.globalSearchService.updateSearch(''); 
    
    // 5. Close UI states
    this.isSearchOpen = false; 
    this.isSearchLoading = false;
    this.autocompleteTrigger.closePanel();
    
    // 6. Blur the input to close the keyboard
    this.searchInput.nativeElement.blur();
  }

  onSearchBlur(): void {
    setTimeout(() => {
      if (document.activeElement !== this.searchInput.nativeElement) {
        this.isSearchOpen = false;
      }
    }, 200); 
  }

  openSearch(): void {
    this.isSearchOpen = true;
    setTimeout(() => { this.searchInput.nativeElement.focus(); }, 100);
  }

  closeSearch(): void {
    this.isSearchOpen = false;
    this.searchQuery = '';
  }

  onSearchChange(): void {}

  onLogout(): void {
    this.authService.logout(); 
    this.authService.logout(); 
    this.profileService.resetLogoToDefault();
  }

  options = this.settings.getOptions();
  setDark() { this.settings.toggleTheme(); }
  openDialog() { const dialogRef = this.dialog.open(AppSearchDialogComponent); }
  changeLanguage(lang: any): void { this.translate.use(lang.code); this.selectedLanguage = lang; }

  notifications: notifications[] = [
    { id: 1, icon: 'a-b-2', color: 'primary', title: 'Launch Admin', time: '8:30 AM', subtitle: 'Just see the my new admin!', },
    // ...
    { id: 1, icon: 'a-b-2', color: 'primary', title: 'Launch Admin', time: '8:30 AM', subtitle: 'Just see the my new admin!', },
    // ...
  ];
  profiledd: profiledd[] = [
    { id: 1, title: 'My Profile', link: '/my-profile', },
    { id: 5, title: 'Sign Out' }
  ];
  apps: apps[] = [
    { id: 1, icon: 'solar:chat-line-line-duotone', color: 'primary', title: 'Chat Application', subtitle: 'Messages & Emails', link: '/', },
    // ...
    { id: 1, icon: 'solar:chat-line-line-duotone', color: 'primary', title: 'Chat Application', subtitle: 'Messages & Emails', link: '/', },
    // ...
  ];
}

@Component({
  selector: 'search-dialog',
  standalone: true,
  imports: [RouterModule, MaterialModule, TablerIconsModule, FormsModule],
  templateUrl: 'search-dialog.component.html',
})
export class AppSearchDialogComponent {
  searchText: string = '';
  navItems = navItems;
  navItemsData = navItems.filter((navitem) => navitem.displayName);
}