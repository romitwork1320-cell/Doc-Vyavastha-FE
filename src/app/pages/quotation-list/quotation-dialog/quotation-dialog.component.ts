import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Clipboard } from '@angular/cdk/clipboard';
import { debounceTime, switchMap, finalize, map } from 'rxjs/operators';
import { of, lastValueFrom } from 'rxjs';

import { QuotationService, QuotationDto } from 'src/app/services/quotation.service';
import { ProductService } from 'src/app/services/products.service';

@Component({
  selector: 'app-quotation-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatAutocompleteModule, MatSelectModule, MatSnackBarModule,
    MatProgressSpinnerModule, TablerIconsModule
  ],
  templateUrl: './quotation-dialog.component.html',
  styleUrls: ['./quotation-dialog.component.scss']
})
export class QuotationDialogComponent implements OnInit {
  quotationForm: FormGroup;
  isSaving = false;
  isLoadingData = false;
  filteredProducts: any[] = [];
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private quotationService: QuotationService,
    private productService: ProductService,
    private snackBar: MatSnackBar,
    private clipboard: Clipboard,
    public dialogRef: MatDialogRef<QuotationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { action: string, id?: number }
  ) {
    this.quotationForm = this.fb.group({
      customerName: ['', Validators.required],
      customerMobile: [''],
      // Final Price is required so we don't save null, but user can edit it
      finalPrice: [0, Validators.required], 
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    if (this.data && this.data.id) {
      this.isEditMode = true;
      this.loadQuotation(this.data.id);
    } else {
      this.addItem(); 
    }
  }

  get items(): FormArray {
    return this.quotationForm.get('items') as FormArray;
  }

  loadQuotation(id: number): void {
    this.isLoadingData = true;
    this.quotationService.getQuotationForEdit(id)
      .pipe(finalize(() => this.isLoadingData = false))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const q = res.data; 
            this.quotationForm.patchValue({
              customerName: q.customerName,
              customerMobile: q.customerMobile || '',
              finalPrice: q.finalPrice
            });
            
            // Mark final price as dirty so we don't auto-calculate it on load
            this.quotationForm.get('finalPrice')?.markAsDirty();

            if (q.items && q.items.length > 0) {
              this.items.clear();
              q.items.forEach((item: any) => {
                this.addItem(item); 
              });
            }
          }
        },
        error: () => this.snackBar.open('Failed to load quotation data', 'Close', { duration: 3000 })
      });
  }

  addItem(data?: any): void {
    const isTitleRow = this.items.length === 0;

    let wVal = null, wUnit = 'Y';
    if (data && data.warrantyText) {
       const nums = data.warrantyText.match(/\d+/);
       if (nums) wVal = parseInt(nums[0], 10);
       if (data.warrantyText.toLowerCase().includes('m')) wUnit = 'M';
       if (data.warrantyText.toLowerCase().includes('d')) wUnit = 'D';
    } else if (isTitleRow) {
        wVal = 3; wUnit = 'Y';
    }

    const itemGroup = this.fb.group({
      productName: [data ? data.productName : '', Validators.required],
      
      // ✅ OPTIONAL: Removed Validators.required
      warrantyValue: [wVal], 
      warrantyUnit: [wUnit], 
      
      quantity: [data ? data.quantity : 1, [Validators.required, Validators.min(1)]],
      
      // ✅ OPTIONAL: Removed Validators.required
      unitPrice: [data ? data.unitPrice : 0] 
    });

    this.attachSearchListener(itemGroup);
    this.items.push(itemGroup);
    this.calculateTotal(); 
  }

  attachSearchListener(group: FormGroup): void {
    group.get('productName')?.valueChanges.pipe(
      debounceTime(300),
      switchMap(value => {
        if (typeof value === 'string' && value.length > 2) {
          return this.productService.getProducts({
            pageIndex: 1, pageSize: 20, filter: value, sortColumn: 'name', sortDirection: 'asc'
          }).pipe(map(res => res.data || []));
        } else {
          return of([]);
        }
      })
    ).subscribe(products => this.filteredProducts = products);
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
    this.calculateTotal();
  }

  onProductSelected(event: any, index: number): void {
    const product = event.option.value;
    const row = this.items.at(index);
    
    let wVal = null, wUnit = 'Y';
    if ((product as any).warranty) {
        const incoming = (product as any).warranty;
        const nums = incoming.match(/\d+/);
        if (nums) wVal = parseInt(nums[0], 10);
        if (incoming.toLowerCase().includes('m')) wUnit = 'M';
    }

    row.patchValue({
      productName: product.name,
      unitPrice: (product as any).sellingPrice || 0,
      warrantyValue: wVal,
      warrantyUnit: wUnit
    });
    this.calculateTotal();
  }

  get totalAmount(): number {
    return this.items.controls.reduce((acc, curr) => {
      const val = curr.value;
      // Handle empty/null values as 0
      return acc + ((val.quantity || 0) * (val.unitPrice || 0));
    }, 0);
  }

  calculateTotal(): void {
    // ✅ ONLY update Final Price if the user has NOT manually touched it.
    // This allows custom final prices.
    if (!this.quotationForm.get('finalPrice')?.dirty) {
      this.quotationForm.patchValue({ finalPrice: this.totalAmount }, { emitEvent: false });
    }
  }

  async saveAndCopy() {
    if (this.quotationForm.invalid) {
      this.quotationForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    // --- 1. OPTIMIZATION: Check if NO changes were made in Edit Mode ---
    if (this.isEditMode && this.data.id && this.quotationForm.pristine) {
      // Skip DB update, just copy existing data
      try {
        const textRes = await lastValueFrom(this.quotationService.getWhatsAppText(this.data.id));
        if (textRes?.success && textRes.data) {
          this.clipboard.copy(textRes.data);
          this.snackBar.open('Copied to Clipboard (No changes detected)', 'OK', { duration: 3000, panelClass: 'success-snackbar' });
        }
        this.dialogRef.close(false); // Pass false to indicate no refresh needed
      } catch (err) {
        this.snackBar.open('Error copying text', 'Close', { duration: 3000 });
      } finally {
        this.isSaving = false;
      }
      return; // Exit early
    }

    // --- 2. Normal Save Logic (Create or Update) ---
    
    // Map form values to DTO
    const formItems = this.quotationForm.value.items;
    const mappedItems = formItems.map((item: any) => ({
      productName: item.productName,
      warrantyText: (item.warrantyValue !== null && item.warrantyValue !== '') 
                    ? `(${item.warrantyValue}${item.warrantyUnit})` 
                    : '',
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || 0
    }));
    
    const quoteTitle = mappedItems.length > 0 ? mappedItems[0].productName : 'New Quotation';

    const dto: QuotationDto = {
      customerName: this.quotationForm.value.customerName,
      customerMobile: this.quotationForm.value.customerMobile,
      title: quoteTitle,
      totalAmount: this.totalAmount,
      finalPrice: this.quotationForm.value.finalPrice,
      items: mappedItems,
      tenantId: 0, 
      userId: 0
    };

    try {
      let res: any; 
      
      if (this.isEditMode && this.data.id) {
         res = await lastValueFrom(this.quotationService.updateQuotation(this.data.id, dto));
      } else {
         res = await lastValueFrom(this.quotationService.createQuotation(dto));
      }

      if (res?.success) {
        const targetId = this.isEditMode ? this.data.id! : res.data;
        const textRes = await lastValueFrom(this.quotationService.getWhatsAppText(targetId));
        
        if (textRes?.success && textRes.data) {
          this.clipboard.copy(textRes.data);
          this.snackBar.open('Saved & Copied to Clipboard!', 'OK', { duration: 3000, panelClass: 'success-snackbar' });
        } else {
          this.snackBar.open('Saved successfully!', 'OK', { duration: 3000, panelClass: 'success-snackbar' });
        }
        
        this.dialogRef.close(true); // Pass true to indicate refresh needed
      } else {
         this.snackBar.open(res?.message || 'Error saving', 'Close', { duration: 3000 });
      }
    } catch (err) {
      this.snackBar.open('Error saving quotation', 'Close', { duration: 3000 });
      console.error(err);
    } finally {
      this.isSaving = false;
    }
  }
}