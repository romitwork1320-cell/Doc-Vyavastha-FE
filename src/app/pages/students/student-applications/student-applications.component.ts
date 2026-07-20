import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { TablerIconsModule } from 'angular-tabler-icons';
import { StudentApplicationService } from '../../../services/student-application.service';
import { StudentService } from '../../../services/student.service';
import { ApplicationTypeService } from '../../../services/application-type.service';
import { ApplicationStatusService } from '../../../services/application-status.service';
import { ApplicationDialogComponent } from './application-dialog.component';
import { FabClickService } from 'src/app/services/fab-click.service';
import { forkJoin, Subject, distinctUntilChanged } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-student-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, TablerIconsModule, MatPaginatorModule],
  templateUrl: './student-applications.component.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex-grow: 1; height: 100%; min-height: 0; }
    .leads-page { padding: 24px; }
    
    .stat-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; flex-shrink: 0; }
    .stat-chip { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer; background: #f1f5f9; color: #64748b; border: 2px solid transparent; transition: all 0.15s; }
    .stat-chip:hover { background: #e2e8f0; }
    .stat-chip.active { border-color: #6366f1; color: #6366f1; background: #eef2ff; }
    .chip-count { background: rgba(0,0,0,0.08); border-radius: 10px; padding: 1px 7px; font-size: 11px; }
    
    .search-box { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; min-width: 220px; }
    .search-input { border: none; outline: none; font-size: 14px; width: 100%; background: transparent; color: #334155; }
    
    .table-card { display: flex; flex-direction: column; flex: 1; min-height: 0; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.07); border: 1px solid #f1f5f9; }
    .common-table-container { flex: 1; overflow: auto; }
    .leads-table { width: 100%; border-collapse: collapse; }
    .leads-table th { padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; background: #f8fafc; border-bottom: 1px solid #f1f5f9; position: sticky; top: 0; z-index: 10; }
    .leads-table td { padding: 12px 16px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
    .leads-table th:last-child, .leads-table td:last-child { text-align: right; }
    .table-row { transition: background 0.1s; }
    .table-row:hover { background: #fafbff; }
    .table-row:last-child td { border-bottom: none; }
    
    .lead-cell { display: flex; align-items: center; gap: 10px; }
    .lead-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 14px; flex-shrink: 0; }
    
    .badge { font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 600; white-space: nowrap; }
    
    .action-btns { display: inline-flex; justify-content: flex-end; gap: 4px; }
    .icon-btn { width: 30px; height: 30px; border: none; background: #f1f5f9; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; transition: all 0.15s; }
    .icon-btn:hover { background: #e2e8f0; color: #334155; }
    .text-red { color: #ef4444; }
    
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px; color: #94a3b8; gap: 8px; flex: 1; }
    .empty-state p { margin: 0; font-size: 14px; }
    
    .custom-paginator { display: flex; align-items: center; justify-content: flex-start; gap: 32px; padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #fff; font-size: 13px; color: #64748b; padding-right: 90px; }
    .paginator-left { display: flex; align-items: center; gap: 24px; }
    .page-size-select { border: none; background: transparent; font-weight: 600; color: #0f172a; outline: none; cursor: pointer; display: flex; align-items: center; }
    .paginator-right { display: flex; align-items: center; gap: 4px; }
    .page-btn { min-width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: none; background: transparent; color: #64748b; font-weight: 500; cursor: pointer; transition: all 0.2s; padding: 0 8px; }
    .page-btn:hover:not(:disabled):not(.dots) { background: #f1f5f9; color: #0f172a; }
    .page-btn.active { background: #2563eb; color: #fff; }
    .page-btn.dots { cursor: default; }
    .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .font-semibold { font-weight: 600; color: #0f172a; }
  `]
})
export class StudentApplicationsComponent implements OnInit, OnDestroy {
  public authService = inject(AuthService);
  applications = signal<any[]>([]);
  availableStatuses = signal<any[]>([]);
  isLoading = false;
  isExporting = false;
  searchQuery = '';
  filterStatus = '';
  
  // Pagination
  totalCount = 0;
  pageSize = 20;
  pageIndex = 0;
  Math = Math;
  
  private destroy$ = new Subject<void>();
  private fabClickService = inject(FabClickService);

  constructor(private service: StudentApplicationService,
    private studentService: StudentService,
    private typeService: ApplicationTypeService,
    private statusService: ApplicationStatusService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute) {}

  filterDeadlines = false;
  initialStatusParam = '';

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['filter'] === 'deadlines') {
        this.filterDeadlines = true;
      } else {
        this.filterDeadlines = false;
      }
      if (params['status']) {
        this.initialStatusParam = params['status'];
      }
    });
    
    this.authService.activeBranchId$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged()
    ).subscribe(branchId => {
      if (branchId) {
        this.pageIndex = 0;
        this.loadData();
      }
    });
    
    this.fabClickService.fabClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.openDialog();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.loadData();
  }

  exportCSV() {
    this.isExporting = true;
    this.service.export({ filter: this.searchQuery, pageIndex: 0, pageSize: 0 }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `StudentApplications_${dateStr}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isExporting = false;
        this.snackBar.open('Export completed successfully.', 'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error('Export failed', err);
        this.isExporting = false;
        this.snackBar.open('Export failed', 'Close', { duration: 3000 });
      }
    });
  }

  // Custom Pagination Logic
  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize) || 1;
  }

  get pages(): (number | string)[] {
    const current = this.pageIndex + 1;
    const total = this.totalPages;
    if (total <= 7) return Array.from({length: total}, (_, i) => i + 1);
    
    if (current <= 3) return [1, 2, 3, 4, '...', total];
    if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  goToPage(p: number | string) {
    if (typeof p === 'number') {
      this.pageIndex = p - 1;
      this.loadData();
    }
  }
  
  prevPage() {
    if (this.pageIndex > 0) {
      this.pageIndex--;
      this.loadData();
    }
  }
  
  nextPage() {
    if (this.pageIndex < this.totalPages - 1) {
      this.pageIndex++;
      this.loadData();
    }
  }

  onPageSizeChange(event: any) {
    this.pageSize = parseInt(event.target.value, 10);
    this.pageIndex = 0;
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    
    const req = {
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      filter: this.searchQuery
    };

    forkJoin({
      apps: this.service.getAll(req),
      students: this.studentService.getAll({ pageIndex: 0, pageSize: 1000 }), // Fetching many students for mapping, ideally should be searched backend
      types: this.typeService.getAll(),
      statuses: this.statusService.getAll()
    }).subscribe({
      next: ({ apps, students, types, statuses }) => {
        if (apps.success && apps.data && students.success && types.success && statuses.success) {
          this.totalCount = apps.totalRecords || 0;
          const st = students.data || [];
          const ty = types.data || [];
          const sta = statuses.data || [];
          
          this.availableStatuses.set(sta.sort((a: any, b: any) => a.displayOrder - b.displayOrder));
          
          if (this.initialStatusParam) {
            const statusObj = sta.find((s: any) => s.name.toLowerCase() === this.initialStatusParam.toLowerCase());
            if (statusObj) {
              this.filterStatus = statusObj.id;
              this.initialStatusParam = ''; // apply only once or keep it, clearing is fine for now if user changes dropdown
            }
          }
          
          const mappedData = apps.data.map(app => {
            const student = st.find(s => s.id === app.studentId);
            const type = ty.find(t => t.id === app.applicationTypeId);
            const status = sta.find(s => s.id === app.applicationStatusId);
            
            return {
              ...app,
              studentName: student ? student.fullName : 'Unknown',
              studentCode: student ? student.studentCode : '',
              typeName: type ? type.name : 'Unknown',
              statusName: status ? status.name : 'Unknown',
              statusColor: status ? status.colorCode : '#ccc',
              collegeNamesString: app.colleges?.map((c: any) => c.name).join(', ') || 'N/A'
            };
          });
          this.applications.set(mappedData);
        }
        this.isLoading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load applications', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  get filteredApps() {
    return this.applications().filter(a => {
      const matchStatus = !this.filterStatus || a.applicationStatusId === this.filterStatus;
      
      let matchDeadline = true;
      if (this.filterDeadlines) {
        if (!a.deadlineDate) {
          matchDeadline = false;
        } else {
          const dl = new Date(a.deadlineDate);
          const now = new Date();
          const diffDays = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 3600 * 24));
          // Considering upcoming as within next 7 days or overdue
          matchDeadline = diffDays >= 0 && diffDays <= 7;
        }
      }

      return matchStatus && matchDeadline;
    });
  }

  goToDetails(id: string) {
    this.router.navigate(['/student-applications/view', id]);
  }

  count(statusId: string) { return this.applications().filter(a => a.applicationStatusId === statusId).length; }

  avatarColor(name: string): string {
    const colors = ['#6366f1','#8b5cf6','#f59e0b','#22c55e','#f97316','#0284c7','#db2777','#dc2626'];
    let h = 0; for (let c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return colors[h % colors.length];
  }

  openDialog(app?: any): void {
    const dialogRef = this.dialog.open(ApplicationDialogComponent, {
      width: '90vw',
      maxWidth: '600px',
      data: app ? { ...app } : {},
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadData();
    });
  }

  deleteItem(id: string): void {
    if (confirm('Are you sure you want to delete this application?')) {
      this.service.delete(id).subscribe(res => {
        if (res.success) {
          this.snackBar.open('Deleted successfully', 'OK', { duration: 3000 });
          this.loadData();
        }
      });
    }
  }
}
