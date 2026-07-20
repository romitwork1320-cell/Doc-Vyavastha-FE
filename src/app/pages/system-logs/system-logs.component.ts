import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectorRef, OnDestroy, ElementRef } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';
import { ApiResponse, PaginationRequestDto } from 'src/app/common/interfaces/common'; 
import { GlobalImportExportService } from 'src/app/services/global-import-export.service';
import { GlobalSearchService } from 'src/app/services/global-search.service';
import { FabClickService } from 'src/app/services/fab-click.service';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { SwipeableDirective } from 'src/app/common/directive/swipeable.directive';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SystemLog, SystemLogService } from 'src/app/services/system-log.service';
import { SystemLogDetailsDialogComponent } from './system-log-details-dialog/system-log-details-dialog.component';

@Component({
  selector: 'app-system-logs',
  templateUrl: './system-logs.component.html',
  styleUrls: ['./system-logs.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TablerIconsModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatMenuModule,
    SwipeableDirective,
    MatTooltipModule,
    DatePipe
  ]
})
export class SystemLogsComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['logDate', 'logLevel', 'source', 'message', 'action'];
  dataSource: MatTableDataSource<SystemLog> = new MatTableDataSource<SystemLog>();
  
  isLoading: boolean = false;
  filterValue: string = '';
  swipedLogId: number | null = null;

  public logs: SystemLog[] = [];
  private currentPage: number = 1; 
  private pageSize: number = 20;
  private hasMoreData: boolean = true;

  private destroy$ = new Subject<void>();
  private fabClickSubscription: Subscription | undefined;
  private searchSubscription: Subscription | undefined;
  private refreshSubscription: Subscription | undefined;
  private exportClickSubscription: Subscription | undefined;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('tableContainer') tableContainer!: ElementRef;

  constructor(
    private systemLogService: SystemLogService, // This will work now that imports are fixed
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef,
    private fabClickService: FabClickService,
    private globalSearchService: GlobalSearchService,
    private globalImportExportService: GlobalImportExportService
  ) {}

  ngOnInit(): void {
    this.fabClickSubscription = this.fabClickService.fabClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.openCleanupDialog();
      });

    this.refreshSubscription = this.globalSearchService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.resetAndLoadLogs());

    this.searchSubscription = this.globalSearchService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe(query => {
        this.filterValue = query;
        this.resetAndLoadLogs();
      });

    this.exportClickSubscription = this.globalImportExportService.exportClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.exportData());
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.sort.sortChange.subscribe(() => this.resetAndLoadLogs());
    this.changeDetectorRef.detectChanges();
    this.loadLogs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onScroll(event: Event): void {
    if (!this.isLoading && this.hasMoreData) {
      const element = event.target as HTMLElement;
      const threshold = 100;
      if (element.scrollHeight - element.scrollTop - element.clientHeight <= threshold) {
        this.loadLogs();
      }
    }
  }

  private resetAndLoadLogs(): void {
    this.logs = [];
    this.currentPage = 1;
    this.hasMoreData = true;
    this.dataSource.data = [];
    this.loadLogs();
  }

  loadLogs(): void {
    if (this.isLoading || !this.hasMoreData) return;

    this.isLoading = true;

    const request: PaginationRequestDto = {
      pageIndex: this.currentPage,
      pageSize: this.pageSize,
      filter: this.filterValue,
      sortColumn: this.sort?.active || 'LogDate',
      sortDirection: (this.sort?.direction || 'desc') as 'asc' | 'desc'
    };

    this.systemLogService.getAllLogs(request)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        // [FIXED] Explicitly typed 'response'
        next: (response: ApiResponse<SystemLog[]>) => {
          if (response.success && response.data) {
            const newLogs = response.data;
            this.logs = [...this.logs, ...newLogs];
            this.dataSource.data = this.logs;
            this.currentPage++;
            
            this.hasMoreData = newLogs.length === this.pageSize;
            this.checkAndLoadMore();
          }
        },
        error: () => this.snackBar.open('Failed to load logs', 'Close', { panelClass: ['error-snackbar'] })
      });
  }

  openDetails(log: SystemLog): void {
    this.swipedLogId = null;
    this.isLoading = true;
    
    this.systemLogService.getLogById(log.logId)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe((res: ApiResponse<SystemLog>) => { // [FIXED] Typed 'res'
        if(res.success && res.data) {
           this.dialog.open(SystemLogDetailsDialogComponent, {
             width: '800px',
             data: res.data
           });
        }
      });
  }

  deleteLog(log: SystemLog): void {
    if(!confirm('Are you sure you want to delete this log entry?')) return;

    this.isLoading = true;
    this.systemLogService.deleteLog(log.logId)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe((res: ApiResponse<any>) => { // [FIXED] Typed 'res'
        if(res.success) {
           this.logs = this.logs.filter(x => x.logId !== log.logId);
           this.dataSource.data = [...this.logs];
           this.snackBar.open('Log deleted', 'Close', { duration: 2000 });
        }
      });
  }

  openCleanupDialog(): void {
    const days = prompt("Delete logs older than how many days? (e.g., 30)");
    if(days) {
      const daysInt = parseInt(days);
      if(!isNaN(daysInt)) {
        this.systemLogService.cleanupLogs(daysInt)
          .subscribe((res: ApiResponse<any>) => { // [FIXED] Typed 'res'
            if(res.success) {
              this.snackBar.open('Cleanup successful', 'Close');
              this.resetAndLoadLogs();
            }
          });
      }
    }
  }

  exportData(): void {
     this.snackBar.open('Export not implemented for logs yet.', 'Close');
  }

  private checkAndLoadMore(): void {
    setTimeout(() => {
      if (!this.tableContainer || !this.hasMoreData || this.isLoading) return;
      const element = this.tableContainer.nativeElement;
      if (element.scrollHeight <= element.clientHeight) {
        this.loadLogs();
      }
    }, 100);
  }

  onSwipe(id: number, action: 'open' | 'close') {
    this.swipedLogId = action === 'open' ? id : null;
  }

  getBadgeClass(level: string): string {
    const safeLevel = (level || '').toLowerCase();
    
    if (safeLevel.includes('error') || safeLevel.includes('crit') || safeLevel.includes('fail')) {
      return 'error';
    }
    if (safeLevel.includes('warn')) {
      return 'warning';
    }
    return 'info';
  }
}