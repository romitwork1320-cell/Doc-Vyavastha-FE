import { CommonModule, DatePipe } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { MatSelectModule } from '@angular/material/select';
import { User } from 'src/app/services/user.service';
import { MatIconModule } from '@angular/material/icon';
import { DisableIfNoPermissionDirective } from 'src/app/common/directive/disable-if-no-permission.directive';
import { AuthService } from 'src/app/services/auth.service';
import { BranchService } from 'src/app/services/branch.service';

// Define the data structure for the dialog
export interface DialogData {
  action: 'Add' | 'Update' | 'Delete';
  user: User;
  branchIds?: string[];
}

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [MaterialModule, FormsModule, ReactiveFormsModule, CommonModule, MatSelectModule,
    MatIconModule,
    DisableIfNoPermissionDirective
  ],
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss'],
  providers: [DatePipe],
})
export class UserDialogComponent implements OnInit {
  action: string;
  local_data: User;
  hidePassword = true;
  canEdit = false;
  branches: any[] = [];
  selectedBranches: string[] = [];
  isLoadingBranches = false;

  constructor(
    public dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private authService: AuthService,
    private branchService: BranchService
  ) {
    this.action = data.action;
    this.local_data = { ...data.user };
    this.canEdit = this.authService.hasPermission('/teams', 'CanEdit');
  }

  ngOnInit() {
    this.loadBranches();
  }

  loadBranches() {
    this.isLoadingBranches = true;
    this.branchService.getBranches().subscribe({
      next: (res) => {
        this.branches = res.data || [];
        if (this.action === 'Update' && this.local_data.id) {
          this.branchService.getUserBranches(this.local_data.id).subscribe({
            next: (bRes) => {
              this.selectedBranches = (bRes.data || []).map(b => b.id);
              this.isLoadingBranches = false;
            },
            error: () => this.isLoadingBranches = false
          });
        } else {
          this.isLoadingBranches = false;
        }
      },
      error: () => {
        this.isLoadingBranches = false;
      }
    });
  }

  doAction(): void {
    if (!this.canEdit) return; 
    this.dialogRef.close({ event: this.action, data: this.local_data, branchIds: this.selectedBranches });
  }

  closeDialog(): void {
    this.dialogRef.close({ event: 'Cancel' });
  }
}