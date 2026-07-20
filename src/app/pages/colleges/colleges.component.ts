import { AuthService } from 'src/app/services/auth.service';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { College } from '../../models/student.models';
import { CollegeService } from '../../services/college.service';
import { CollegeDialogComponent } from './college-dialog.component';
import { FabClickService } from 'src/app/services/fab-click.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Triggering angular compiler rebuild to detect new files
@Component({
  selector: 'app-colleges',
  standalone: true,
  imports: [CommonModule, FormsModule, TablerIconsModule],
  templateUrl: './colleges.component.html',
  styleUrls: ['../students/student-categories/student-categories.component.scss']
})
export class CollegesComponent implements OnInit, OnDestroy {
  colleges = signal<College[]>([]);
  isLoading = false;
  searchQuery = '';
  
  private destroy$ = new Subject<void>();
  private fabClickService = inject(FabClickService);

  constructor(private service: CollegeService,
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
    this.service.getAll().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.colleges.set(res.data);
        }
        this.isLoading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load colleges', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  get filteredColleges() {
    return this.colleges().filter(c => {
      const q = this.searchQuery.toLowerCase();
      const matchSearch = !q || (c.name && c.name.toLowerCase().includes(q));
      return matchSearch;
    });
  }

  count() { return this.colleges().length; }

  openDialog(college?: College): void {
    const dialogRef = this.dialog.open(CollegeDialogComponent, {
      width: '90vw',
      maxWidth: '600px',
      data: college ? { ...college } : {},
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadData();
    });
  }

  deleteItem(id: string): void {
    if (confirm('Are you sure you want to delete this college?')) {
      this.service.delete(id).subscribe((res: any) => {
        if (res.success) {
          this.snackBar.open('Deleted successfully', 'OK', { duration: 3000 });
          this.loadData();
        }
      });
    }
  }
}
