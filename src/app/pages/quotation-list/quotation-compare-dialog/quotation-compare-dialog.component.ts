import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TablerIconsModule } from 'angular-tabler-icons';
import { forkJoin } from 'rxjs';
import { QuotationService, QuotationDto } from 'src/app/services/quotation.service';

@Component({
  selector: 'app-quotation-compare-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TablerIconsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './quotation-compare-dialog.component.html',
  styleUrls: ['./quotation-compare-dialog.component.scss']
})
export class QuotationCompareDialogComponent implements OnInit {
  
  isLoading = true;
  quotations: QuotationDto[] = [];
  
  // To handle row alignment
  maxItemCount = 0;
  itemRows: number[] = [];

  constructor(
    public dialogRef: MatDialogRef<QuotationCompareDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { ids: number[] },
    private quotationService: QuotationService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    // 1. Create an array of Observables for the selected IDs
    const requests = this.data.ids.map(id => this.quotationService.getQuotationForEdit(id));

    // 2. Fetch them all in parallel
    forkJoin(requests).subscribe({
      next: (responses) => {
        // Filter out any failed requests and get the data
        this.quotations = responses
          .filter(res => res.success && res.data)
          .map(res => res.data!);

        this.calculateLayout();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        // Handle error (optional)
      }
    });
  }

  calculateLayout() {
    // Find which quote has the most items to define the table rows
    this.maxItemCount = Math.max(...this.quotations.map(q => q.items.length));
    this.itemRows = Array(this.maxItemCount).fill(0).map((x, i) => i);
  }

  // Helper to check if a specific quote has the lowest price
  isCheapest(currentPrice: number): boolean {
    const minPrice = Math.min(...this.quotations.map(q => q.finalPrice));
    return currentPrice === minPrice;
  }
}