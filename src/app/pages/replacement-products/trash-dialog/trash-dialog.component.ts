import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ReplacementProductService } from 'src/app/services/replacement-product.service';
import { ReplacementProductDialogComponent, DialogData } from '../replacement-product-dialog/replacement-product-dialog.component';
import { ConfirmationDialogComponent } from 'src/app/common/component/confirmation-dialog/confirmation-dialog.component';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-trash-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    MatDialogModule, 
    MatTableModule, 
    MatButtonModule, 
    MatIconModule, 
    MatProgressSpinnerModule, 
    TablerIconsModule,
    MatTooltipModule
  ],
  templateUrl: './trash-dialog.component.html',
  styleUrls: ['./trash-dialog.component.scss']
})
export class TrashDialogComponent implements OnInit, OnDestroy {
  trashList: any[] = [];
  
  isLoading = true;
  isLoadingMore = false;
  pageIndex = 0;
  pageSize = 15;
  hasMoreData = true;
  hasActionTaken = false;

  displayedColumns = ['invertNo', 'product', 'customer', 'deletedDate', 'actions'];

  private destroy$ = new Subject<void>();
  private scrollSubject = new Subject<Event>();

  constructor(
    public dialogRef: MatDialogRef<TrashDialogComponent>,
    private service: ReplacementProductService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.scrollSubject.pipe(
      debounceTime(150),
      takeUntil(this.destroy$)
    ).subscribe((event) => this.handleScroll(event));
  }

  ngOnInit() {
    this.loadTrash(); 

    this.dialogRef.backdropClick().pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.closeDialog();
    });

    this.dialogRef.keydownEvents().pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.key === 'Escape') {
        this.closeDialog();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onScroll(event: Event) {
    this.scrollSubject.next(event);
  }

  private handleScroll(event: Event) {
    const element = event.target as HTMLElement;
    if (!element) return;

    if (element.scrollHeight - element.scrollTop <= element.clientHeight + 50) {
      if (this.hasMoreData && !this.isLoadingMore && !this.isLoading) {
        this.pageIndex++;
        this.loadTrash(true);
      }
    }
  }

  loadTrash(isLoadMore: boolean = false) {
    if (isLoadMore) {
      this.isLoadingMore = true;
    } else {
      this.isLoading = true;
      this.pageIndex = 0;
      this.hasMoreData = true;
    }

    this.service.getTrash(this.pageIndex, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const newData = res.data || [];

          if (isLoadMore) {
            this.trashList = [...this.trashList, ...newData];
          } else {
            this.trashList = newData;
          }

          this.hasMoreData = newData.length === this.pageSize;

          this.isLoading = false;
          this.isLoadingMore = false;
        },
        error: () => {
          this.isLoading = false;
          this.isLoadingMore = false;
          this.snackBar.open('Error loading trash', 'Close', { duration: 3000 });
        }
      });
  }

  closeDialog() {
    this.dialogRef.close(this.hasActionTaken);
  }

  trackById(index: number, item: any): number {
    return item.id; // Or item.invertNo if id is not unique
  }

  restore(id: number) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      data: {
        title: 'Restore Item',
        message: 'Are you sure you want to restore this item?',
        subMessage: 'This item will be moved back to the active replacements list.',
        confirmButtonText: 'Restore',
        confirmButtonColor: 'primary',
        type: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.service.restoreReplacement(id).subscribe({
          next: () => {
            this.snackBar.open('Item restored successfully', 'Close', { 
                duration: 3000, 
                panelClass: ['success-snackbar'] 
            });
            
            this.trashList = this.trashList.filter(item => item.id !== id);
            this.hasActionTaken = true; 
          },
          error: () => {
            this.snackBar.open('Error restoring item', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
          }
        });
      }
    });
  }
}