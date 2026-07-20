import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TablerIconsModule } from 'angular-tabler-icons';
import { StudentApplicationService } from '../../../../services/student-application.service';
import { StudentService } from '../../../../services/student.service';
import { ApplicationTypeService } from '../../../../services/application-type.service';
import { ApplicationStatusService } from '../../../../services/application-status.service';
import { FormTypeService } from '../../../../services/form-type.service';
import { forkJoin } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppRecentActivityComponent } from '../../../starter/recent-activity/recent-activity.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApplicationDialogComponent } from '../application-dialog.component';

@Component({
  selector: 'app-application-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    TablerIconsModule,
    AppRecentActivityComponent,
    MatDialogModule
  ],
  templateUrl: './application-details.component.html',
  styleUrls: ['./application-details.component.scss']
})
export class ApplicationDetailsComponent implements OnInit {
  appId: string = '';
  application: any = null;
  student: any = null;
  type: any = null;
  status: any = null;
  formType: any = null;
  isLoading = true;
  showPassword = false;

  constructor(
    private route: ActivatedRoute,
    private appService: StudentApplicationService,
    private studentService: StudentService,
    private typeService: ApplicationTypeService,
    private statusService: ApplicationStatusService,
    private formTypeService: FormTypeService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.route.params.subscribe(params => {
      this.appId = params['id'];
    });
  }

  ngOnInit(): void {
    if (this.appId) {
      this.loadData();
    }
  }

  loadData(): void {
    this.isLoading = true;
    this.appService.getById(this.appId).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.application = res.data;
          
          if (this.application.applicationTypeId && this.application.applicationTypeId !== '') {
            this.typeService.getById(this.application.applicationTypeId).subscribe(res => {
              this.type = res.data;
            });
          }

          if (this.application.formTypeId && this.application.formTypeId !== '') {
            this.formTypeService.getById(this.application.formTypeId).subscribe(res => {
              this.formType = res.data;
            });
          }
          
          this.application.collegeNamesString = this.application.colleges?.map((c: any) => c.name).join(', ') || 'N/A';
          
          forkJoin({
            student: this.studentService.getById(this.application.studentId),
            types: this.typeService.getAll(),
            statuses: this.statusService.getAll(),
            formTypes: this.formTypeService.getAll()
          }).subscribe({
            next: (extras: any) => {
              if (extras.student.success) this.student = extras.student.data;
              if (extras.types.success) {
                this.type = extras.types.data?.find((t: any) => t.id === this.application.applicationTypeId);
              }
              if (extras.statuses.success) {
                this.status = extras.statuses.data?.find((s: any) => s.id === this.application.applicationStatusId);
              }
              if (extras.formTypes.success && this.application.formTypeId) {
                this.formType = extras.formTypes.data?.find((f: any) => f.id === this.application.formTypeId);
              }
              this.isLoading = false;
            },
            error: () => {
              this.isLoading = false;
            }
          });
        } else {
          this.snackBar.open('Application not found', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      },
      error: () => {
        this.snackBar.open('Failed to load application', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  copyToClipboard(text: string | null | undefined): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Copied to clipboard!', 'Close', { duration: 2000 });
    });
  }

  avatarColor(name: string): string {
    if (!name) return '#6366f1';
    const colors = ['#f43f5e', '#ec4899', '#d946ef', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#f97316'];
    const charCode = name.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  }

  openEditDialog(): void {
    if (!this.application) return;
    const dialogRef = this.dialog.open(ApplicationDialogComponent, {
      width: '90vw',
      maxWidth: '600px',
      data: { ...this.application },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }
}
