import { AuthService } from 'src/app/services/auth.service';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Branch, BranchService } from '../../services/branch.service';
import { BranchDialogComponent } from './branch-dialog.component';
import { FabClickService } from 'src/app/services/fab-click.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [CommonModule, FormsModule, TablerIconsModule],
  templateUrl: './branches.component.html',
  styleUrls: ['../students/student-categories/student-categories.component.scss']
})
export class BranchesComponent implements OnInit, OnDestroy {
  branches = signal<Branch[]>([]);
  isLoading = false;
  searchQuery = '';

  private destroy$ = new Subject<void>();
  private fabClickService = inject(FabClickService);

  constructor(private service: BranchService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public authService: AuthService) {}

  ngOnInit(): void {
    this.loadData();
    this.fabClickService.fabClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => { this.openDialog(); });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.isLoading = true;
    this.service.getBranches().subscribe({
      next: (res) => {
        this.branches.set(res.data || []);
        this.isLoading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load branches', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  get filteredBranches(): Branch[] {
    const q = this.searchQuery.toLowerCase();
    if (!q) return this.branches();
    return this.branches().filter(b =>
      b.name.toLowerCase().includes(q) ||
      (b.code && b.code.toLowerCase().includes(q)) ||
      (b.contact && b.contact.toLowerCase().includes(q))
    );
  }

  openDialog(branch?: Branch): void {
    const ref = this.dialog.open(BranchDialogComponent, {
      width: '500px',
      data: branch || null
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadData();
    });
  }

  deleteBranch(branch: Branch): void {
    if (!confirm(`Are you sure you want to delete "${branch.name}"?`)) return;
    this.service.deleteBranch(branch.id).subscribe({
      next: () => {
        this.snackBar.open('Branch deleted successfully', 'Close', { duration: 3000 });
        this.loadData();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to delete branch';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }
}
