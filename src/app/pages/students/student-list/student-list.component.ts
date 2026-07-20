import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Student } from '../../../models/student.models';
import { StudentService } from '../../../services/student.service';
import { StudentCategoryService } from '../../../services/student-category.service';
import { StudentApplicationService } from '../../../services/student-application.service';
import { ApplicationStatusService } from '../../../services/application-status.service';
import { ApplicationTypeService } from '../../../services/application-type.service';
import { StudentFeePlanService } from '../../../services/student-fee-plan.service';
import { StudentPaymentService } from '../../../services/student-payment.service';
import { StudentDialogComponent } from '../student-dialog/student-dialog.component';
import { FabClickService } from 'src/app/services/fab-click.service';
import { forkJoin, Subject, distinctUntilChanged, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TablerIconsModule, MatPaginatorModule, MatSelectModule],
  templateUrl: './student-list.component.html',
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
    .status-active { background: #dcfce7; color: #166534; }
    .status-inactive { background: #fee2e2; color: #991b1b; }
    
    .action-btns { display: inline-flex; justify-content: flex-end; gap: 4px; }
    .icon-btn { width: 30px; height: 30px; border: none; background: #f1f5f9; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; transition: all 0.15s; }
    .icon-btn:hover { background: #e2e8f0; color: #334155; }
    .text-red { color: #ef4444; }
    
    .app-count-box { display: flex; flex-direction: column; gap: 6px; }
    .app-count-total { display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: #475569; }
    .app-count-total i-tabler { width: 16px; height: 16px; color: #94a3b8; }
    .app-count-pending { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #b45309; background: #fffbeb; padding: 3px 8px; border-radius: 12px; width: max-content; border: 1px solid #fde68a; }
    .pending-dot { width: 6px; height: 6px; background-color: #f59e0b; border-radius: 50%; box-shadow: 0 0 0 2px #fef3c7; }
    
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
export class StudentListComponent implements OnInit, OnDestroy {
  public authService = inject(AuthService);
  students = signal<any[]>([]);
  applicationTypes = signal<any[]>([]);
  isLoading = false;
  isExporting = false;
  searchQuery = '';
  filterStatus = '';
  filterAppType = '';
  
  // Pagination
  totalCount = 0;
  pageSize = 20;
  pageIndex = 0;
  Math = Math;
  
  private destroy$ = new Subject<void>();
  private fabClickService = inject(FabClickService);

  constructor(
    private service: StudentService,
    private catService: StudentCategoryService,
    private appService: StudentApplicationService,
    private statService: ApplicationStatusService,
    private appTypeService: ApplicationTypeService,
    private feePlanService: StudentFeePlanService,
    private paymentService: StudentPaymentService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  filterNewThisMonth = false;
  filterFeePlanned = false;
  filterFeeCollected = false;
  filterFeePending = false;

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.filterNewThisMonth = params['filter'] === 'new_this_month';
      this.filterFeePlanned = params['filter'] === 'fee_planned';
      this.filterFeeCollected = params['filter'] === 'fee_collected';
      this.filterFeePending = params['filter'] === 'fee_pending';
    });

    this.loadAppTypes();
    
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
  
  loadAppTypes(): void {
    this.appTypeService.getAll().subscribe(res => {
      if (res.success && res.data) {
        this.applicationTypes.set(res.data);
      }
    });
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.loadData();
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
      filter: this.searchQuery,
      applicationTypeId: this.filterAppType || undefined
    };
    const hasFeeFilter = this.filterFeePlanned || this.filterFeeCollected || this.filterFeePending;

    forkJoin({
      students: this.service.getAll(req),
      categories: this.catService.getAll(),
      applications: this.appService.getAll({ pageIndex: 0, pageSize: 1000 }), // Fetching enough apps to count pending for now
      statuses: this.statService.getAll(),
      feePlans: hasFeeFilter ? this.feePlanService.getAll() : of({ success: true, data: [] }),
      feePayments: hasFeeFilter ? this.paymentService.getAll() : of({ success: true, data: [] })
    }).subscribe({
      next: ({ students, categories, applications, statuses, feePlans, feePayments }) => {
        if (students.success && students.data && categories.success && categories.data) {
          this.totalCount = students.totalRecords || 0;
          const cats = categories.data;
          const apps = applications.data || [];
          const stats = statuses.data || [];
          const plans = feePlans.data || [];
          const payments = feePayments.data || [];
          
          const completedStat = stats.find(s => s.name === 'Completed');
          const completedId = completedStat ? completedStat.id : 'stat-3';

          const mappedData = students.data.map(std => {
            const cat = cats.find(c => c.id === std.categoryId);
            const stdApps = apps.filter(a => a.studentId === std.id);
            const pendingApps = stdApps.filter(a => a.applicationStatusId !== completedId);
            
            // Calculate fees for this student
            const stdPlans = plans.filter(p => p.studentId === std.id);
            const stdPayments = payments.filter(p => p.studentId === std.id);
            
            const totalFeePlanned = stdPlans.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
            const totalFeeCollected = stdPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const totalFeePending = totalFeePlanned - totalFeeCollected;
            
            return { 
              ...std, 
              categoryName: cat ? cat.name : 'Unknown',
              fullName: std.fullName,
              pendingApplications: pendingApps.length,
              totalFeePlanned,
              totalFeeCollected,
              totalFeePending
            };
          });
          this.students.set(mappedData);
        }
        this.isLoading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load students', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  exportCSV() {
    this.isExporting = true;
    this.service.export({ filter: this.searchQuery, pageIndex: 0, pageSize: 0 }, this.filterAppType).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `Students_${dateStr}.csv`;
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

  get filteredStudents() {
    return this.students().filter(s => {
      const matchStatus = !this.filterStatus || s.status === this.filterStatus;
      
      let matchMonth = true;
      if (this.filterNewThisMonth && s.createdAt) {
        const createdDate = new Date(s.createdAt);
        const now = new Date();
        matchMonth = createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
      }
      
      let matchFee = true;
      if (this.filterFeePlanned && s.totalFeePlanned <= 0) {
        matchFee = false;
      }
      if (this.filterFeeCollected && s.totalFeeCollected <= 0) {
        matchFee = false;
      }
      if (this.filterFeePending && s.totalFeePending <= 0) {
        matchFee = false;
      }
      
      return matchStatus && matchMonth && matchFee;
    });
  }

  count(status: string) { return this.students().filter(s => s.status === status).length; }

  avatarColor(name: string): string {
    const colors = ['#6366f1','#8b5cf6','#f59e0b','#22c55e','#f97316','#0284c7','#db2777','#dc2626'];
    let h = 0; for (let c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return colors[h % colors.length];
  }

  openDialog(student?: any): void {
    const dialogRef = this.dialog.open(StudentDialogComponent, {
      width: '95vw',
      maxWidth: '900px',
      data: student ? { student } : {},
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadData();
    });
  }

  viewDetails(id: string): void {
    this.router.navigate(['/students/view', id]);
  }

  deleteItem(id: string): void {
    if (confirm('Are you sure you want to delete this student?')) {
      this.service.delete(id).subscribe(res => {
        if (res.success) {
          this.snackBar.open('Deleted successfully', 'OK', { duration: 3000 });
          this.loadData();
        }
      });
    }
  }
}
