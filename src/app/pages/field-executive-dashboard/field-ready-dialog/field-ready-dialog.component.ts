import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Observable, startWith, map } from 'rxjs';
import { PaginationRequestDto } from 'src/app/common/interfaces/common';
import { Product, ProductService } from 'src/app/services/products.service';

@Component({
  selector: 'app-field-ready-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatCheckboxModule, MatButtonModule,
    MatAutocompleteModule
  ],
  templateUrl: './field-ready-dialog.component.html',
 styleUrls: ['./field-ready-dialog.component.scss']
})
export class FieldReadyDialogComponent implements OnInit {
  form: FormGroup;
  products: Product[] = [];
  filteredProducts: Observable<Product[]>;

  // Status Options (Hardcoded or fetched from service)
  productStatuses = [
    { id: 4, name: 'Repair' },
    { id: 5, name: 'Replace' },
    { id: 6, name: 'Not Accepted' } // Adjust IDs to match your DB 'ProductStatus' table
  ];

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    public dialogRef: MatDialogRef<FieldReadyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { productName: string, invertNo: string }
  ) {
    this.form = this.fb.group({
      productStatusId: [1, Validators.required], // Default to Repair
      newSerialNo: [''],
      isUpgraded: [false],
      upgradedProduct: [''], // Holds the object
      notes: ['']
    });
  }

  ngOnInit(): void {
    // 1. Load Products for "Upgrade" dropdown
    this.loadProducts();

    // 2. Conditional Logic: "Replace" status enables "New Serial No"
    this.form.get('productStatusId')?.valueChanges.subscribe(statusId => {
      const serialCtrl = this.form.get('newSerialNo');
      const upgradeCtrl = this.form.get('isUpgraded');

      if (statusId === 5) { // Replace
        serialCtrl?.setValidators([Validators.required]);
        upgradeCtrl?.enable();
      } else {
        serialCtrl?.clearValidators();
        serialCtrl?.setValue('');
        upgradeCtrl?.setValue(false);
        upgradeCtrl?.disable();
      }
      serialCtrl?.updateValueAndValidity();
    });

    // 3. Conditional Logic: "Upgrade" enables "Product Name"
    this.form.get('isUpgraded')?.valueChanges.subscribe(isUpgraded => {
      const productCtrl = this.form.get('upgradedProduct');
      if (isUpgraded) {
        productCtrl?.setValidators([Validators.required]);
        productCtrl?.enable();
      } else {
        productCtrl?.clearValidators();
        productCtrl?.setValue('');
        productCtrl?.disable();
      }
      productCtrl?.updateValueAndValidity();
    });
  }

  loadProducts() {
    const req: PaginationRequestDto = { pageIndex: 0, pageSize: 1000, filter: '', sortColumn: 'Name', sortDirection: 'asc' };
    this.productService.getProducts(req).subscribe(res => {
      if(res.success && res.data) {
        this.products = res.data;
        this.setupAutocomplete();
      }
    });
  }

  setupAutocomplete() {
    this.filteredProducts = this.form.get('upgradedProduct')!.valueChanges.pipe(
      startWith(''),
      map(value => {
        const name = typeof value === 'string' ? value : value?.name;
        return name ? this._filter(name as string) : this.products.slice();
      })
    );
  }

  private _filter(name: string): Product[] {
    const filterValue = name.toLowerCase();
    return this.products.filter(option => option.name.toLowerCase().includes(filterValue));
  }

  displayFn(product: Product): string {
    return product && product.name ? product.name : '';
  }

  submit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}