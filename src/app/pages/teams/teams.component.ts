import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectorRef, OnDestroy, ElementRef } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, debounceTime, distinctUntilChanged, Subject, Observable, takeUntil, skip, forkJoin, of } from 'rxjs'; // Added Subject, Observable, forkJoin
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Added FormsModule for ngModel
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ApiResponse, PaginationRequestDto } from 'src/app/common/interfaces/common';
import { TeamCreateDto, User, UserService, TeamUpdateDto, UserTenantLookupDto } from 'src/app/services/user.service';
import { UserDialogComponent, DialogData } from './user-dialog/user-dialog.component';
import { AuthService } from 'src/app/services/auth.service';
import { BranchService } from 'src/app/services/branch.service';
import { DisableIfNoPermissionDirective } from 'src/app/common/directive/disable-if-no-permission.directive';
import { HttpErrorResponse } from '@angular/common/http';

// --- Imports from PermissionsComponent ---
import { PageDto, PermissionService, RoleDto, RolePagePermissionDto } from 'src/app/services/permission.service';
import { MatTabsModule } from '@angular/material/tabs'; // <-- Import MatTabsModule
import { MatCheckboxModule } from '@angular/material/checkbox'; // <-- Import MatCheckboxModule
import { FabClickService } from 'src/app/services/fab-click.service';
import { GlobalSearchService } from 'src/app/services/global-search.service';
import { MatSelectModule } from '@angular/material/select';
import { UserPermissionDialogComponent } from './user-permission-dialog/user-permission-dialog.component';
import { MatMenuModule } from '@angular/material/menu';

// --- Helper type from PermissionsComponent ---
type PermissionMap = {
  [pageId: number]: {
    [roleId: number]: RolePagePermissionDto;
  };
};

@Component({
  selector: 'app-teams', // Keep selector the same if replacing the old component
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // <-- Add FormsModule
    TablerIconsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    // MatPaginatorModule, // Removed as Teams uses infinite scroll
    MatSortModule,
    MatProgressSpinnerModule,
    RouterLink,
    UserDialogComponent,
    DisableIfNoPermissionDirective,
    MatTabsModule, // <-- Add MatTabsModule
    MatCheckboxModule, // <-- Add MatCheckboxModule
    MatSelectModule,
    UserPermissionDialogComponent,
    MatMenuModule
  ]
})
export class TeamsComponent implements OnInit, AfterViewInit, OnDestroy {

  // --- User Properties ---
  userDisplayedColumns: string[] = ['#', 'name', 'username', 'role', 'action'];
  usersDataSource: MatTableDataSource<User> = new MatTableDataSource<User>();
  isLoadingUsers: boolean = false;
  usersFilterValue: string = '';
  public users: User[] = [];
  public usersCurrentPage: number = 0;
  public usersPageSize: number = 15;
  private usersHasMoreData: boolean = true;
  private usersFilterSubject = new Subject<string>();
  @ViewChild('usersSort') usersSort!: MatSort; // Unique ViewChild name
  canAddUser = false;
  canEditUser = false;
  canDeleteUser = false;

  // --- Permission Properties ---
  permissionsDisplayedColumns: string[] = ['pageName'];
  permissionsDataSource = new MatTableDataSource<PageDto>();
  public pages: PageDto[] = [];
  public roles: RoleDto[] = [];
  public permissions: PermissionMap = {};
  isLoadingPermissions = false;
  permissionsFilterValue = '';
  // totalRecords = 0; // Not needed if using client-side filtering for permissions table
  private permissionsFilterSubject = new Subject<string>();
  public canEditPermissions = false;
  selectedTabIndex = 0;
  @ViewChild('permissionsSort') permissionsSort!: MatSort; // Unique ViewChild name
  @ViewChild('tableContainer') tableContainer!: ElementRef;

  private filterSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  

  constructor(
    private userService: UserService,
    private permissionService: PermissionService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef,
    private authService: AuthService,
    private globalSearchService: GlobalSearchService,
    private fabClickService: FabClickService,
    private branchService: BranchService
  ) {}
  
  ngOnInit(): void {
    // --- User Permissions ---
    const usersPageUrl = '/teams'; // Or your actual route
    this.canAddUser = this.authService.hasPermission(usersPageUrl, 'CanAdd');
    this.canEditUser = this.authService.hasPermission(usersPageUrl, 'CanEdit');
    this.canDeleteUser = this.authService.hasPermission(usersPageUrl, 'CanDelete');

    // --- Role Permissions Permissions ---
    const permissionsPageUrl = '/permissions'; // Or the route defined in your DB for permissions
    this.canEditPermissions = this.authService.hasPermission(permissionsPageUrl, 'CanEdit');

    this.globalSearchService.searchQuery$
      .pipe(
        takeUntil(this.destroy$),
        skip(1) // Skip initial empty value
      )
      .subscribe((query) => {
        // This will now receive search text from the header
        this.filterSubject.next(query);
      });

    // --- 2. (NEW) Listen for Global FAB Click ---
    // This assumes the main FAB icon is 'plus'
    this.fabClickService.fabClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Only open the "Add User" dialog if we are on the "Teams" tab
        if (this.selectedTabIndex === 0) {
          this.openUserDialog('Add');
        }
      });

    // --- 3. (MODIFIED) Your existing filter logic (this is perfect) ---
    this.filterSubject
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((filterValue) => {
        // This part remains the same, it just gets its value from a different source now
        if (this.selectedTabIndex === 0) {
          this.usersFilterValue = filterValue;
          this.resetAndLoadUsers();
        } else {
          this.permissionsFilterValue = filterValue;
          this.applyPermissionsFilter();
        }
      });
    
    // --- 4. (NEW) Tell the FAB service to show the 'plus' button ---
    // We only show the simple 'plus' button, not a menu
    // We also set the placeholder for the search bar
    this.fabClickService.show({ icon: 'plus' });
    this.globalSearchService.show('Search User or Page');
  }

  onTabChange(index: number): void {
    // 1. Update the component's property
    this.selectedTabIndex = index;

    // 2. Show or hide the FAB
    if (index === 0) {
      // Index 0 is the "Teams" tab
      this.fabClickService.show({ icon: 'add' });
    } else {
      // All other tabs (like "Role Permissions")
      this.fabClickService.hide();
    }
  }

  ngAfterViewInit(): void {
    // --- User Table Sort ---
    if (this.usersSort) {
      this.usersDataSource.sort = this.usersSort;
      this.usersSort.sortChange
        .pipe(takeUntil(this.destroy$)) 
        .subscribe(() => {
          this.resetAndLoadUsers();
        });
    }

    // --- Permissions Table Sort ---
    if (this.permissionsSort) {
        this.permissionsDataSource.sort = this.permissionsSort;
        // Client-side sort handled automatically by MatTableDataSource
    }

    this.changeDetectorRef.detectChanges(); // Necessary after ViewChild initialization

    // --- Initial Data Load ---
    this.loadUsers();
    this.loadPermissions(); // Load permissions data
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.globalSearchService.hide();
    this.fabClickService.hide();
  }

  // --- User Methods ---
  onScroll(event: Event): void {
    if (!this.isLoadingUsers && this.usersHasMoreData) {
      const element = event.target as HTMLElement;
      const threshold = 100;
      if (element.scrollHeight - element.scrollTop - element.clientHeight <= threshold) {
        this.loadUsers();
      }
    }
  }

  private resetAndLoadUsers(): void {
    this.users = [];
    this.usersCurrentPage = 0;
    this.usersHasMoreData = true;
    this.usersDataSource.data = []; // Clear current data
    this.loadUsers();
  }

  loadUsers(): void {
    if (this.isLoadingUsers || !this.usersHasMoreData) {
      return;
    }
    this.isLoadingUsers = true;
    const request: PaginationRequestDto = {
      pageIndex: this.usersCurrentPage,
      pageSize: this.usersPageSize,
      filter: this.usersFilterValue,
      sortColumn: this.usersSort?.active,
      sortDirection: (this.usersSort?.direction || null) as 'asc' | 'desc' | null,
    };

    this.userService.getUsers(request)
      .pipe(finalize(() => this.isLoadingUsers = false))
      .subscribe({
        next: (response: ApiResponse<User[]>) => {
          if (response.success) {
            const newUsers = response.data || [];
            this.users = [...this.users, ...newUsers];
            this.usersDataSource.data = this.users; // Update datasource
            this.usersCurrentPage++;
            this.usersHasMoreData = newUsers.length === this.usersPageSize;
            this.checkAndLoadMore();
          } else {
            this.showError(`Error loading users: ${response.message}`);
          }
        },
        error: (error) => {
          console.error('Failed to load users:', error);
          this.showError('Failed to load users. Please try again.');
        }
      });
  }

  openUserDialog(action: 'Add' | 'Update' | 'Delete', user?: User): void {
      let dialogUser: User;
      if (action === 'Add') {
        dialogUser = {
          id: 0,
          username: '',
          role: 'Viewer', // Default role
          isActive: true,
          tenantId: 0 // Will be set in handleDialogAction
        } as User;
      } else {
        dialogUser = user ? { ...user } : {} as User;
      }

      const dialogData: DialogData = {
        action: action,
        user: dialogUser
      };

      const dialogRef = this.dialog.open(UserDialogComponent, {
        width: '600px',
        data: dialogData
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result && result.event !== 'Cancel') {
          this.handleUserDialogAction(result.event, result.data, result.branchIds);
        }
      });
  }

  handleUserDialogAction(action: 'Add' | 'Update' | 'Delete', data: User, branchIds?: string[]): void {
      this.isLoadingUsers = true;
      let apiCall: Observable<any>;

      const tenantId = this.authService.getTenantId();
      if (!tenantId) {
        this.showError("Error: Tenant ID is missing.");
        this.isLoadingUsers = false;
        return;
      }

      if (action === 'Add') {
        const createDto: TeamCreateDto = {
          username: data.username,
          roleName: data.role,
          tenantId: tenantId,
          firstName: data.firstName,
          lastName: data.lastName,
          contactNumber: data.contactNumber
        };
        apiCall = this.userService.createUser(createDto);
      }
      else if (action === 'Update') {
        const updateDto: TeamUpdateDto = {
          roleName: data.role,
          isActive: data.isActive,
          tenantId: tenantId,
          firstName: data.firstName,
          lastName: data.lastName,
          contactNumber: data.contactNumber
        };
        apiCall = this.userService.updateUser(data.id, updateDto);
      }
      else if (action === 'Delete') {
        apiCall = this.userService.removeUserFromTenant(data.id, tenantId);
      }
      else {
        this.isLoadingUsers = false;
        return;
      }

      apiCall.pipe(finalize(() => (this.isLoadingUsers = false))).subscribe({
        next: (response: ApiResponse<any>) => {
          if (response.success) {
            
            // Branch Assignment Logic
            let branchObs: Observable<any> = of(null);
            if ((action === 'Add' || action === 'Update') && branchIds) {
               const targetUserId = action === 'Add' ? response.data.id : data.id;
               
               if (action === 'Update') {
                  // For update, we need to compare existing vs new branches, or simply assign all and rely on BE upsert,
                  // but BE only has assignUserToBranch and removeUserFromBranch. 
                  // For robust UI, we should fetch existing first, or just have BE handle upserts. 
                  // Since we have branchIds, let's just make sequentially delete and assign calls, 
                  // but we'll fetch existing and diff them to be safe.
                  branchObs = new Observable(obs => {
                      this.branchService.getUserBranches(targetUserId).subscribe(res => {
                          const existingIds = (res.data || []).map((b: any) => b.id);
                          const toAdd = branchIds.filter(id => !existingIds.includes(id));
                          const toRemove = existingIds.filter(id => !branchIds.includes(id));
                          
                          const operations: Observable<any>[] = [];
                          toAdd.forEach(id => operations.push(this.branchService.assignUserToBranch(id, targetUserId)));
                          toRemove.forEach(id => operations.push(this.branchService.removeUserFromBranch(id, targetUserId)));
                          
                          if (operations.length > 0) {
                              forkJoin(operations).subscribe(() => { obs.next(); obs.complete(); });
                          } else {
                              obs.next(); obs.complete();
                          }
                      });
                  });
               } else {
                  // Add mode
                  const operations = branchIds.map(id => this.branchService.assignUserToBranch(id, targetUserId));
                  if (operations.length > 0) {
                      branchObs = forkJoin(operations);
                  }
               }
            }
            
            branchObs.subscribe(() => {
                this.showSuccess(response.message);

                if (action === 'Add') {
                  const newUser = response.data as User;
                  if (newUser) {
                    this.users.unshift(newUser); // Add new user to the top of the local array
                    this.usersDataSource.data = [...this.users]; // Trigger table update
                  } else {
                    this.resetAndLoadUsers();
                  }
                } else if (action === 'Update') {
                  const index = this.users.findIndex((u) => u.id === data.id);
                  if (index > -1) {
                    this.users[index] = { ...this.users[index], ...data };
                    this.usersDataSource.data = [...this.users]; // Trigger table update
                  }
                } else if (action === 'Delete') {
                  this.users = this.users.filter((u) => u.id !== data.id);
                  this.usersDataSource.data = [...this.users]; // Trigger table update
                }
            });
          } else {
            this.showError(`Error: ${response.message}`);
          }
        },
        error: (error: HttpErrorResponse) => {
          console.error(`Failed to ${action} user:`, error);
            if (error.status === 403) {
              this.showError('Access Denied: You do not have permission.');
            } else if (error.status === 409 && action === 'Add') {
               this.showError('Username already exists.');
            } else {
               this.showError(`Failed to ${action} user. Please try again.`);
            }
        },
      });
  }

  // --- Permission Methods ---
  onPermissionsFilterChange(value: string): void {
    this.permissionsFilterSubject.next(value);
  }

  applyPermissionsFilter(): void {
    // Client-side filtering
    this.permissionsDataSource.filter = this.permissionsFilterValue.trim().toLowerCase();
  }

  // NOTE: Permissions load all at once, no pagination needed usually
  loadPermissions(): void {
    this.isLoadingPermissions = true;
    const request: PaginationRequestDto = { pageIndex: 0, pageSize: 1000, filter: '', sortColumn: '', sortDirection: null }; 

    this.permissionService.getPermissions(request)
      .pipe(finalize(() => this.isLoadingPermissions = false))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.pages = response.data.pages;
            this.roles = response.data.roles;

            this.permissionsDisplayedColumns = ['pageName', ...this.roles.map(r => r.roleName)];
            this.permissionsDataSource.data = this.pages; 
            this.permissionsDataSource.sort = this.permissionsSort;

            this.permissions = {};
            for (const page of this.pages) {
              this.permissions[page.pageId] = {};
              for (const role of this.roles) {
                const perm = response.data.permissions.find(p => p.pageId === page.pageId && p.roleId === role.roleId);
                this.permissions[page.pageId][role.roleId] = perm || {
                  pageId: page.pageId, roleId: role.roleId, canView: false, canAdd: false, canEdit: false, canDelete: false
                };
              }
            }
             this.applyPermissionsFilter();
          } else {
            this.showError(response.message || 'Failed to load permissions.');
          }
        },
        error: (err) => this.showError('Failed to load permissions.')
      });
  }

  savePermissions(): void {
      if (!this.canEditPermissions) {
          this.showError('You do not have permission to save changes.');
          return;
      }
    this.isLoadingPermissions = true;
    const payload: RolePagePermissionDto[] = [];
    for (const pageId in this.permissions) {
      for (const roleId in this.permissions[pageId]) {
        payload.push(this.permissions[pageId][roleId]);
      }
    }

    this.permissionService.updatePermissions(payload)
      .pipe(finalize(() => this.isLoadingPermissions = false))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showSuccess('Permissions saved successfully!');
            this.loadPermissions(); // Reload to confirm changes
          } else {
            this.showError(response.message || 'Failed to save permissions.');
          }
        },
        error: (err) => this.showError('Failed to save permissions.')
      });
  }

  // --- Shared Helper Methods ---
  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
  }

  private applyFilter(filterValue: string): void {
      if (this.selectedTabIndex === 0) {
          // Filter Users
          this.usersFilterValue = filterValue;
          this.resetAndLoadUsers(); // Trigger backend filter for users
      } else {
          // Filter Permissions (client-side)
          this.permissionsFilterValue = filterValue;
          this.applyPermissionsFilter();
      }
  }

  private checkAndLoadMore(): void {
    // Wait a tick for the DOM to update with the new rows
    setTimeout(() => {
      // Safety checks
      if (!this.tableContainer || !this.usersHasMoreData || this.isLoadingUsers) {
        return;
      }

      const element = this.tableContainer.nativeElement;
      
      // Logic: If the total height (scrollHeight) is less than or equal to 
      // the visible height (clientHeight), there is no scrollbar yet.
      // Therefore, we must load more data immediately.
      if (element.scrollHeight <= element.clientHeight) {
        this.loadUsers();
      }
    }, 100); // 100ms delay allows the DOM to render the rows
  }

  openPermissionDialog(user: User): void {
    this.dialog.open(UserPermissionDialogComponent, {
      width: '600px',
      data: { user: user }
    });
  }
}