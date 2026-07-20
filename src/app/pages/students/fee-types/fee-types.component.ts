import { AuthService } from 'src/app/services/auth.service';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { FeeTypeService } from '../../../services/fee-type.service';
import { FeeType } from '../../../models/fee.models';
import { FeeTypeDialogComponent } from './fee-type-dialog.component';
import { StudentCategoryService } from '../../../services/student-category.service';
import { FabClickService } from 'src/app/services/fab-click.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-fee-types',
  standalone: true,
  imports: [CommonModule, FormsModule, TablerIconsModule],
  templateUrl: './fee-types.component.html',
  styleUrls: ['../student-categories/student-categories.component.scss'] // Reusing common list styles
})
export class FeeTypesComponent implements OnInit, OnDestroy {
  feeTypes = signal<FeeType[]>([]);
  categoriesMap = signal<Record<string, string>>({});
  isLoading = false;
  searchQuery = '';
  
  private destroy$ = new Subject<void>();
  private fabClickService = inject(FabClickService);

  constructor(private service: FeeTypeService,
    private categoryService: StudentCategoryService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public authService: AuthService) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadData();
    this.fabClickService.fabClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.openDialog());
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
          this.feeTypes.set(res.data);
        }
        this.isLoading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load fee types', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const map: Record<string, string> = {};
          res.data.forEach((cat: any) => {
            map[cat.id] = cat.name;
          });
          this.categoriesMap.set(map);
        }
      }
    });
  }

  getCategoryNames(categoryIds?: string[]): string[] {
    if (!categoryIds || categoryIds.length === 0) return [];
    const map = this.categoriesMap();
    return categoryIds.map(id => map[id] || 'Unknown').filter(name => name);
  }

  get filteredTypes() {
    const q = this.searchQuery.toLowerCase();
    return this.feeTypes().filter(t => !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }

  openDialog(feeType?: FeeType): void {
    const dialogRef = this.dialog.open(FeeTypeDialogComponent, {
      width: '90vw',
      maxWidth: '500px',
      data: feeType ? { ...feeType, allFeeTypes: this.feeTypes() } : { allFeeTypes: this.feeTypes() },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadData();
    });
  }

  deleteItem(id: string): void {
    if (confirm('Are you sure you want to delete this fee type?')) {
      this.service.delete(id).subscribe((res: any) => {
        if (res.success) {
          this.loadData();
        }
      });
    }
  }

  toggleStatus(feeType: FeeType): void {
    const newStatus = feeType.status === 'Active' ? 'Inactive' : 'Active';
    const updatedFeeType = { ...feeType, status: newStatus as 'Active' | 'Inactive' };
    this.service.update(feeType.id, updatedFeeType).subscribe((res: any) => {
      if (res.success) {
        this.loadData();
      }
    });
  }
}
