import { AuthService } from 'src/app/services/auth.service';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { StudentCodeSequenceService } from '../../../services/student-code-sequence.service';
import { StudentCodeConfigurationService } from '../../../services/student-code-configuration.service';
import { StudentCategoryService } from '../../../services/student-category.service';
import { SequenceDialogComponent } from './sequence-dialog.component';
import { FabClickService } from 'src/app/services/fab-click.service';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-student-code-sequences',
  standalone: true,
  imports: [CommonModule, FormsModule, TablerIconsModule],
  templateUrl: './student-code-sequences.component.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex-grow: 1; height: 100%; min-height: 0; }
    .leads-page { padding: 24px; }
    
    .stat-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; flex-shrink: 0; }
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
    
    .action-btns { display: inline-flex; justify-content: flex-end; gap: 4px; }
    .icon-btn { width: 30px; height: 30px; border: none; background: #f1f5f9; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; transition: all 0.15s; }
    .icon-btn:hover { background: #e2e8f0; color: #334155; }
    .text-red { color: #ef4444; }
    
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px; color: #94a3b8; gap: 8px; flex: 1; }
    .empty-state p { margin: 0; font-size: 14px; }
  `]
})
export class StudentCodeSequencesComponent implements OnInit, OnDestroy {
  sequences = signal<any[]>([]);
  isLoading = false;
  searchQuery = '';
  
  private destroy$ = new Subject<void>();
  private fabClickService = inject(FabClickService);

  constructor(private service: StudentCodeSequenceService,
    private confService: StudentCodeConfigurationService,
    private catService: StudentCategoryService,
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
    forkJoin({
      sequences: this.service.getAll(),
      configs: this.confService.getAll(),
      categories: this.catService.getAll()
    }).subscribe({
      next: ({ sequences, configs, categories }) => {
        if (sequences.success && sequences.data && configs.success && configs.data && categories.success && categories.data) {
          const confs = configs.data;
          const cats = categories.data;
          
          const mappedData = sequences.data.map(seq => {
            const conf = confs.find(c => c.id === seq.yearConfigId);
            let categoryName = 'Unknown';
            let businessYear = 'Unknown';
            if (conf) {
              const cat = cats.find(c => c.id === conf.categoryId);
              if (cat) categoryName = cat.name;
              businessYear = conf.businessYear.toString();
            }
            return { ...seq, categoryName, businessYear };
          });
          this.sequences.set(mappedData);
        }
        this.isLoading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load sequences', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  get filteredSequences() {
    return this.sequences().filter(s => {
      const q = this.searchQuery.toLowerCase();
      return !q || 
        (s.categoryName && s.categoryName.toLowerCase().includes(q)) || 
        (s.lastGeneratedCode && s.lastGeneratedCode.toLowerCase().includes(q));
    });
  }

  openDialog(sequence?: any): void {
    const dialogRef = this.dialog.open(SequenceDialogComponent, {
      width: '90vw',
      maxWidth: '600px',
      data: sequence ? { ...sequence } : {},
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadData();
    });
  }

  deleteItem(id: string): void {
    if (confirm('Are you sure you want to delete this sequence?')) {
      this.service.delete(id).subscribe(res => {
        if (res.success) {
          this.snackBar.open('Deleted successfully', 'OK', { duration: 3000 });
          this.loadData();
        }
      });
    }
  }
}
