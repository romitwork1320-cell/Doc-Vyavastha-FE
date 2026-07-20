import { AuthService } from 'src/app/services/auth.service';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { StudentCaste } from '../../../models/student.models';
import { StudentCasteService } from '../../../services/student-caste.service';
import { CasteDialogComponent } from './caste-dialog.component';
import { FabClickService } from 'src/app/services/fab-click.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-student-castes',
  standalone: true,
  imports: [CommonModule, FormsModule, TablerIconsModule],
  templateUrl: './student-castes.component.html',
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
    
    .table-card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.07); border: 1px solid #f1f5f9; }
    .leads-table { width: 100%; border-collapse: collapse; }
    .leads-table th { padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; background: #f8fafc; border-bottom: 1px solid #f1f5f9; position: sticky; top: 0; z-index: 10; }
    .leads-table td { padding: 12px 16px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
    .leads-table th:last-child, .leads-table td:last-child { text-align: right; }
    .table-row { transition: background 0.1s; }
    .table-row:hover { background: #fafbff; }
    .table-row:last-child td { border-bottom: none; }
    
    .badge { font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 600; white-space: nowrap; }
    .status-active { background: #dcfce7; color: #166534; }
    .status-inactive { background: #fee2e2; color: #991b1b; }
    
    .action-btns { display: inline-flex; justify-content: flex-end; gap: 4px; }
    .icon-btn { width: 30px; height: 30px; border: none; background: #f1f5f9; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; transition: all 0.15s; }
    .icon-btn:hover { background: #e2e8f0; color: #334155; }
    .text-red { color: #ef4444; }
    
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px; color: #94a3b8; gap: 8px; flex: 1; }
    .empty-state p { margin: 0; font-size: 14px; }
  `]
})
export class StudentCastesComponent implements OnInit, OnDestroy {
  castes = signal<StudentCaste[]>([]);
  isLoading = false;
  searchQuery = '';
  filterStatus = '';
  
  private destroy$ = new Subject<void>();
  private fabClickService = inject(FabClickService);

  constructor(private service: StudentCasteService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public authService: AuthService) {}

  ngOnInit(): void {
    this.loadData();
    
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

  loadData(): void {
    this.isLoading = true;
    this.service.getAll({ pageIndex: 0, pageSize: 1000 }).subscribe({
      next: (res) => {
        if (res.success) {
          this.castes.set(res.data || []);
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Error loading castes', 'Close', { duration: 3000 });
      }
    });
  }

  get filteredCastes(): StudentCaste[] {
    return this.castes().filter(c => {
      const matchSearch = c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                          (c.description && c.description.toLowerCase().includes(this.searchQuery.toLowerCase()));
      const matchStatus = this.filterStatus ? c.status === this.filterStatus : true;
      return matchSearch && matchStatus;
    });
  }

  count(status: string): number {
    return this.castes().filter(c => c.status === status).length;
  }

  openDialog(caste?: StudentCaste): void {
    const dialogRef = this.dialog.open(CasteDialogComponent, {
      width: '500px',
      data: { caste }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  delete(id: string): void {
    if (confirm('Are you sure you want to delete this caste?')) {
      this.service.delete(id).subscribe({
        next: (res) => {
          if (res.success) {
            this.snackBar.open('Deleted successfully', 'Close', { duration: 3000 });
            this.loadData();
          } else {
            this.snackBar.open(res.message || 'Error deleting', 'Close', { duration: 3000 });
          }
        },
        error: () => this.snackBar.open('Something went wrong', 'Close', { duration: 3000 })
      });
    }
  }
}
