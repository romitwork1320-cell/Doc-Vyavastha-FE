import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { PageDto, PermissionService, RoleDto, RolePagePermissionDto } from 'src/app/services/permission.service';
import { ApiResponse, PaginationRequestDto } from 'src/app/common/interfaces/common';
import { AuthService } from 'src/app/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatCheckboxModule } from '@angular/material/checkbox';

// Helper type for the UI's data structure
type PermissionMap = {
  [pageId: number]: {
    [roleId: number]: RolePagePermissionDto;
  };
};

@Component({
  selector: 'app-permissions',
  templateUrl: './permissions.component.html',
  styleUrls: ['./permissions.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TablerIconsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    RouterLink,
    MatCheckboxModule
  ]
})
export class PermissionsComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['pageName'];
  dataSource = new MatTableDataSource<PageDto>();
  
  // Data holders
  public pages: PageDto[] = [];
  public roles: RoleDto[] = [];
  public permissions: PermissionMap = {};

  isLoading = false;
  filterValue = '';
  totalRecords = 0;
  
  private currentPage = 0;
  private pageSize = 15;
  private filterSubject = new Subject<string>();
  
  public canEditPermissions = false;

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private permissionService: PermissionService,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check if the current user has permission to edit this page
    this.canEditPermissions = this.authService.hasPermission('/permissions', 'CanEdit');

    this.filterSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(filter => {
      this.filterValue = filter;
      this.resetAndLoad();
    });
  }

  ngAfterViewInit(): void {
    this.sort.sortChange.subscribe(() => {
      this.currentPage = 0;
      this.loadPermissions();
    });
    this.loadPermissions();
  }

  onFilterChange(value: string): void {
    this.filterSubject.next(value);
  }

  resetAndLoad(): void {
    this.currentPage = 0;
    this.loadPermissions();
  }

  loadPermissions(): void {
    this.isLoading = true;
    const request: PaginationRequestDto = {
      pageIndex: this.currentPage,
      pageSize: this.pageSize,
      filter: this.filterValue,
      sortColumn: this.sort?.active,
      sortDirection: (this.sort?.direction || null) as 'asc' | 'desc' | null,
    };

    this.permissionService.getPermissions(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Store the data from the API
            this.pages = response.data.pages;
            this.roles = response.data.roles;
            this.totalRecords = response.data.totalRecords;
            
            // Build the dynamic columns for the table
            this.displayedColumns = ['pageName', ...this.roles.map(r => r.roleName)];
            this.dataSource.data = this.pages;

            // Transform the flat permission list into a nested map for easy access in the template
            this.permissions = {}; // Clear old data
            for (const page of this.pages) {
              this.permissions[page.pageId] = {};
              for (const role of this.roles) {
                const perm = response.data.permissions.find(p => p.pageId === page.pageId && p.roleId === role.roleId);
                this.permissions[page.pageId][role.roleId] = perm || {
                  pageId: page.pageId, roleId: role.roleId, canView: false, canAdd: false, canEdit: false, canDelete: false
                };
              }
            }
          } else {
            this.snackBar.open(response.message, 'Close', { duration: 3000 });
          }
        },
        error: (err) => this.snackBar.open('Failed to load permissions.', 'Close', { duration: 3000 })
      });
  }

  saveChanges(): void {
    this.isLoading = true;
    
    // Flatten the permission map back into a simple list to send to the API
    const payload = [];
    for (const pageId in this.permissions) {
      for (const roleId in this.permissions[pageId]) {
        payload.push(this.permissions[pageId][roleId]);
      }
    }

    this.permissionService.updatePermissions(payload)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('Permissions saved successfully!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          } else {
            this.snackBar.open(response.message, 'Close', { duration: 3000 });
          }
        },
        error: (err) => this.snackBar.open('Failed to save permissions.', 'Close', { duration: 3000 })
      });
  }
}