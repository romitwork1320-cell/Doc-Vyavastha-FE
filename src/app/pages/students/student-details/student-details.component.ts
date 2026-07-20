import {  Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule, MatTabChangeEvent } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { TablerIconsModule } from 'angular-tabler-icons';
import { StudentService } from '../../../services/student.service';
import { StudentApplicationService } from '../../../services/student-application.service';
import { ApplicationTypeService } from '../../../services/application-type.service';
import { ApplicationStatusService } from '../../../services/application-status.service';
import { forkJoin, Subject, distinctUntilChanged } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { StudentDialogComponent } from '../student-dialog/student-dialog.component';
import { StudentFeeManagementComponent } from './student-fee-management/student-fee-management.component';

import { ApplicationDialogComponent } from '../student-applications/application-dialog.component';
import { AppRecentActivityComponent } from '../../starter/recent-activity/recent-activity.component';

@Component({
  selector: 'app-student-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    TablerIconsModule,
    StudentFeeManagementComponent,
    ApplicationDialogComponent,
    AppRecentActivityComponent
  ],
  templateUrl: './student-details.component.html',
  styles: [`
    .profile-card { border: none; }
    .profile-banner { height: 100px; background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%); }
    .profile-avatar-wrapper { margin-top: -50px; margin-bottom: 16px; display: flex; justify-content: center; }
    .profile-avatar { width: 100px; height: 100px; border-radius: 50%; border: 4px solid #fff; object-fit: cover; background: #e0e0e0; box-shadow: 0 4px 10px rgba(0,0,0,0.08); }
    .profile-content { padding: 0 24px 24px; }
    
    .status-badge { padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .active-badge { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
    .inactive-badge { background: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }
    
    .edit-btn { height: 44px; border-radius: 8px; font-weight: 600; font-size: 14px; background: #8b5cf6; }
    .edit-btn:hover { background: #7c3aed; box-shadow: 0 4px 12px rgba(139,92,246,0.3); }
    
    .contact-item { display: flex; align-items: center; margin-bottom: 20px; }
    .contact-item:last-child { margin-bottom: 0; }
    .icon-wrapper { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 16px; flex-shrink: 0; }
    .contact-detail { display: flex; flex-direction: column; overflow: hidden; }
    .contact-detail .label { font-size: 12px; color: #64748b; font-weight: 500; margin-bottom: 2px; }
    .contact-detail .value { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .main-tabs-card { border: none; }
    .tab-content-bg { background-color: #f8fafc; min-height: 400px; }
    
    ::ng-deep .custom-tab-group .mat-mdc-tab-header { border-bottom: 1px solid #f1f5f9; padding: 0 16px; }
    ::ng-deep .custom-tab-group .mat-mdc-tab { font-weight: 600; font-family: inherit; color: #64748b; }
    ::ng-deep .custom-tab-group .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label { color: #8b5cf6; }
    ::ng-deep .custom-tab-group .mdc-tab-indicator__content--underline { border-color: #8b5cf6; border-top-width: 3px; border-radius: 3px 3px 0 0; }

    .info-card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    .info-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; }
    .header-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px; }
    .info-body { padding: 20px; }
    
    .detail-label { font-size: 12px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .detail-value { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
    .scholarship-section .detail-label { color: #2e7d32; }

    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .empty-icon-wrapper { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    
    .modern-table th { background: #f8fafc; padding: 16px; border-bottom: 1px solid #e2e8f0; }
    .modern-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; }
    .hover-row:hover { background-color: #f8fafc; cursor: pointer; transition: 0.2s; }
    
    .status-chip { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
  `]
})
export class StudentDetailsComponent implements OnInit {
  public authService = inject(AuthService);
  studentId: string | null = null;
  student: any = null;
  isLoading = true;

  // Applications Tab
  applications: any[] = [];
  appColumns: string[] = ['applicationNumber', 'type', 'status', 'appliedDate', 'lastDate'];

  @ViewChild(AppRecentActivityComponent) recentActivity?: AppRecentActivityComponent;

  constructor(
    private route: ActivatedRoute,
    private studentService: StudentService,
    private appService: StudentApplicationService,
    private typeService: ApplicationTypeService,
    private statusService: ApplicationStatusService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.studentId = this.route.snapshot.paramMap.get('id');
    
    this.authService.activeBranchId$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged()
    ).subscribe(branchId => {
      if (branchId && this.studentId) {
        this.loadDetails();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDetails() {
    forkJoin({
      student: this.studentService.getById(this.studentId!),
      apps: this.appService.getByStudentId(this.studentId!),
      types: this.typeService.getAll(),
      statuses: this.statusService.getAll()
    }).subscribe({
      next: (res) => {
        if (res.student.success) {
          this.student = res.student.data;
        }
        
        if (res.apps.success && res.types.success && res.statuses.success) {
          const typeMap = new Map(res.types.data?.map(t => [t.id, t.name]));
          const statusMap = new Map(res.statuses.data?.map(s => [s.id, s.name]));
          
          this.applications = (res.apps.data || []).map(app => ({
            ...app,
            typeName: typeMap.get(app.applicationTypeId) || 'Unknown',
            statusName: statusMap.get(app.applicationStatusId) || 'Unknown'
          }));
        }
        
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  editStudent() {
    if (!this.student) return;
    const dialogRef = this.dialog.open(StudentDialogComponent, {
      width: '95vw',
      maxWidth: '900px',
      data: { student: this.student },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDetails();
        if (this.recentActivity) {
          this.recentActivity.loadData(true);
        }
      }
    });
  }

  openApplicationDialog() {
    if (!this.student) return;
    const dialogRef = this.dialog.open(ApplicationDialogComponent, {
      width: '95vw',
      maxWidth: '800px',
      data: { fixedStudentId: this.student.id },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDetails();
        if (this.recentActivity) {
          this.recentActivity.loadData(true);
        }
      }
    });
  }

  onTabChange(event: MatTabChangeEvent) {
    if (event.tab.textLabel === 'Activity Log' && this.recentActivity) {
      this.recentActivity.loadData(true);
    }
  }

  viewApplication(appId: string) {
    this.router.navigate(['/student-applications/view', appId]);
  }
}
