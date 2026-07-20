import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Observable, of, Subject } from 'rxjs';
import { debounceTime, map, startWith, takeUntil } from 'rxjs/operators';

import { ProductService } from '../../../../../../services/products.service';
import { ProductDialogComponent } from 'src/app/pages/products/product-dialog/product-dialog.component';

// Minimal Product interface for local filtering
export interface BillingProduct {
  id: number;
  name: string;
  sellingPrice?: number;
  description?: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-billing-item-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatAutocompleteModule, MatButtonToggleModule,
    MatSelectModule,
    MatSnackBarModule, TablerIconsModule
  ],
  templateUrl: './billing-item-dialog.component.html',
  styleUrls: ['./billing-item-dialog.component.scss']
})
export class BillingItemDialogComponent implements OnInit {
  itemForm: FormGroup;

  // All products loaded upfront — same pattern as Replacement dialog
  allProducts: BillingProduct[] = [];
  filteredProducts!: Observable<BillingProduct[]>;

  taxCategories = [
    { label: 'GST @ 0.25%', value: 0.25 },
    { label: 'GST @ 1%', value: 1 },
    { label: 'GST @ 1.5%', value: 1.5 },
    { label: 'GST @ 3%', value: 3 },
    { label: 'GST @ 5%', value: 5 },
    { label: 'GST @ 6%', value: 6 },
    { label: 'GST @ 7.5%', value: 7.5 },
    { label: 'GST @ 12%', value: 12 },
    { label: 'GST @ 18%', value: 18 },
    { label: 'GST @ 28%', value: 28 },
    { label: 'GST @ 40%', value: 40 },
    { label: 'Nil rated', value: 0 },
    { label: 'Non-GST', value: 0 },
    { label: 'Exempt', value: 0 }
  ];

  taxAmount = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<BillingItemDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { item?: any }
  ) {
    this.itemForm = this.fb.group({
      productId:      [null],
      itemName:       ['', Validators.required],
      qty:            [1,  [Validators.required, Validators.min(0.001)]],
      rateInput:      [0,  [Validators.required, Validators.min(0)]],
      rateIncludesTax:[false],
      rateWithoutTax: [0],
      discountValue:  [0,  [Validators.min(0)]],
      discountType:   ['%'],
      taxPercent:     [18], // default 18% or 0
      description:    [''],
      totalAmount:    [0]
    });
  }

  ngOnInit(): void {
    // Patch existing item data first
    if (this.data?.item) {
      // Setup rateInput for existing items
      const item = { ...this.data.item };
      
      // If it was saved with tax, calculate the inclusive rate to show in the UI
      if (item.rateIncludesTax) {
        const taxMult = 1 + (Number(item.taxPercent || 0) / 100);
        item.rateInput = item.rateWithoutTax * taxMult;
      } else {
        item.rateInput = item.rateWithoutTax;
      }
      
      this.itemForm.patchValue(item);
    }

    // Load all products, THEN setup the filter (matches Replacement dialog pattern)
    this.productService.getProducts({
      pageIndex: 0, pageSize: 10000, filter: '', sortColumn: 'name', sortDirection: 'asc'
    }).subscribe(res => {
      this.allProducts = res.data || [];
      this.setupProductFilter();
    });

    // Recalculate total on every form change
    this.itemForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateTotal());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Local filter with "Add Product" option (matches Replacement pattern) ──
  setupProductFilter(): void {
    this.filteredProducts = this.itemForm.get('itemName')!.valueChanges.pipe(
      startWith(this.itemForm.get('itemName')?.value || ''),
      debounceTime(200),
      map(value => {
        // If an object is selected, don't show the dropdown again
        if (typeof value === 'object' && value !== null) return [];

        const q = (value as string)?.trim() || '';
        if (q.length === 0) return [];
        if (q === '*') return this.allProducts;

        const filtered = this._filterProducts(q);

        // Append "Add Product" if no exact match — matches Replacement pattern
        const exactMatch = this.allProducts.some(
          p => p.name.toLowerCase() === q.toLowerCase()
        );
        if (!exactMatch && q.length > 0) {
          filtered.push({
            id: -1,
            name: `Add Product '${q}'`,
            isActive: true
          } as BillingProduct);
        }
        return filtered;
      })
    );
  }

  private _filterProducts(query: string): BillingProduct[] {
    const q = query.toLowerCase();
    return this.allProducts.filter(p => p.name.toLowerCase().includes(q));
  }

  // ── displayWith: shows the product name in the input after selection ──
  displayProductName(product: any): string {
    if (!product) return '';
    if (typeof product === 'string') return product;
    return product.name || '';
  }

  onProductSelected(event: any): void {
    const product = event.option.value;

    // "Add Product" option selected — open product dialog
    if (product?.id === -1) {
      const newName = product.name.match(/'(.*?)'/)?.[1] || '';
      this.openNewProductDialog(newName);
      return;
    }

    this.itemForm.patchValue({
      productId:      product.id,
      itemName:       product.name,
      rateInput:      product.sellingPrice || 0,
      rateIncludesTax: false,
      rateWithoutTax: product.sellingPrice || 0,
      description:    product.description || ''
    });
  }

  openNewProductDialog(name: string): void {
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '500px',
      data: { action: 'Add', product: { name } }
    });

    dialogRef.afterClosed().subscribe(result => {
      // ProductDialogComponent returns { event: 'Add', data: product }
      if (result?.event === 'Add' && result?.data) {
        const savedProduct = result.data;
        // Refresh products and auto-select the new one
        this.productService.getProducts({
          pageIndex: 0, pageSize: 10000, filter: '', sortColumn: 'name', sortDirection: 'asc'
        }).subscribe(res => {
          this.allProducts = res.data || [];
          const newProduct = this.allProducts.find(
            p => p.name.toLowerCase() === savedProduct.name?.toLowerCase()
          );
          if (newProduct) {
            this.itemForm.patchValue({
              productId:      newProduct.id,
              itemName:       newProduct.name,
              rateInput:      newProduct.sellingPrice || 0,
              rateIncludesTax: false,
              rateWithoutTax: newProduct.sellingPrice || 0,
              description:    newProduct.description || ''
            });
          }
        });
      } else {
        // Cancelled — reset the field
        this.itemForm.get('itemName')?.setValue('', { emitEvent: false });
      }
    });
  }

  calculateTotal(): void {
    const qty          = Number(this.itemForm.get('qty')?.value)           || 0;
    const rateInput    = Number(this.itemForm.get('rateInput')?.value)     || 0;
    const isInclusive  = this.itemForm.get('rateIncludesTax')?.value === true;
    const discountVal  = Number(this.itemForm.get('discountValue')?.value)  || 0;
    const discountType = this.itemForm.get('discountType')?.value || '%';
    const taxPercent   = Number(this.itemForm.get('taxPercent')?.value)    || 0;

    // Calculate Rate Without Tax
    let rateWithoutTax = rateInput;
    if (isInclusive && taxPercent > 0) {
      rateWithoutTax = rateInput / (1 + (taxPercent / 100));
    }

    // Amount before discount
    let baseAmount = qty * rateWithoutTax;

    // Apply Discount
    let amountAfterDiscount = baseAmount;
    if (discountVal > 0) {
      amountAfterDiscount = discountType === '%'
        ? baseAmount - (baseAmount * (discountVal / 100))
        : baseAmount - (discountVal * qty);
    }

    // Apply Tax
    this.taxAmount = amountAfterDiscount * (taxPercent / 100);
    const finalTotal = amountAfterDiscount + this.taxAmount;

    this.itemForm.patchValue({ 
      rateWithoutTax: rateWithoutTax,
      totalAmount: Math.max(0, finalTotal) 
    }, { emitEvent: false });
  }

  getDiscountAmount(): number {
    const qty          = Number(this.itemForm.get('qty')?.value)           || 0;
    const rateInput    = Number(this.itemForm.get('rateInput')?.value)     || 0;
    const isInclusive  = this.itemForm.get('rateIncludesTax')?.value === true;
    const taxPercent   = Number(this.itemForm.get('taxPercent')?.value)    || 0;

    let rateWithoutTax = rateInput;
    if (isInclusive && taxPercent > 0) {
      rateWithoutTax = rateInput / (1 + (taxPercent / 100));
    }
    const baseAmount = qty * rateWithoutTax;
    
    const discountVal  = Number(this.itemForm.get('discountValue')?.value)  || 0;
    const discountType = this.itemForm.get('discountType')?.value || '%';

    if (discountVal === 0) return 0;
    if (discountType === '%') {
      return baseAmount * (discountVal / 100);
    }
    return discountVal * qty;
  }

  getBaseTotal(): number {
    const qty          = Number(this.itemForm.get('qty')?.value)           || 0;
    const rateInput    = Number(this.itemForm.get('rateInput')?.value)     || 0;
    const isInclusive  = this.itemForm.get('rateIncludesTax')?.value === true;
    const taxPercent   = Number(this.itemForm.get('taxPercent')?.value)    || 0;

    let rateWithoutTax = rateInput;
    if (isInclusive && taxPercent > 0) {
      rateWithoutTax = rateInput / (1 + (taxPercent / 100));
    }
    return (qty * rateWithoutTax) - this.getDiscountAmount();
  }

  save(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.itemForm.getRawValue());
  }
}
