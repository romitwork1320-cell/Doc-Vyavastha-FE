import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { TablerIconsModule } from 'angular-tabler-icons';
import { User, UserService, PageDto } from 'src/app/services/user.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-user-permission-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatIconModule,
    TablerIconsModule
  ],
  templateUrl: './user-permission-dialog.component.html',
  styleUrls: ['./user-permission-dialog.component.scss']
})
export class UserPermissionDialogComponent implements OnInit {
  isLoading = true;
  isToggling: number | null = null;
  pages: PageDto[] = [];
  allowedUrls: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<UserPermissionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: User },
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.userService.getAllPages().subscribe({
      next: (res) => {
        if (res.success) {
          this.pages = res.data || [];
          this.userService.getUserPermissions(this.data.user.id).subscribe({
            next: (permRes) => {
              if (permRes.success) {
                this.allowedUrls = (permRes.data || []).map(u => u.toLowerCase());
              }
              this.isLoading = false;
            },
            error: () => this.isLoading = false
          });
        }
      },
      error: () => this.isLoading = false
    });
  }

  isPageAllowed(page: PageDto): boolean {
    if (!page.routeUrl) return false;
    return this.allowedUrls.includes(page.routeUrl.toLowerCase());
  }

  togglePermission(page: PageDto, event: any) {
    const isChecked = event.checked;
    this.isToggling = page.pageId;

    this.userService.grantPermission(this.data.user.id, page.pageId, isChecked)
      .pipe(finalize(() => this.isToggling = null))
      .subscribe({
        next: (res) => {
          if (!res.success) {
            event.source.checked = !isChecked;
          } else {
            const url = page.routeUrl?.toLowerCase() || '';
            if (isChecked) {
              this.allowedUrls.push(url);
            } else {
              this.allowedUrls = this.allowedUrls.filter(u => u !== url);
            }
          }
        },
        error: () => event.source.checked = !isChecked
      });
  }

  close() {
    this.dialogRef.close();
  }
}