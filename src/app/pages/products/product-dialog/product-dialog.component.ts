// src/app/products/product-dialog/product-dialog.component.ts

import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Use FormsModule
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

// Angular Material Imports
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox'; // Use MatCheckboxModule for consistency
import { Product } from 'src/app/services/products.service';
import { MaterialModule } from 'src/app/material.module';

// Import Product interface from your service file

// Define the data structure for the dialog
export interface DialogData {
  action: string; // 'Add', 'Update', 'Delete'
  product: Product; // The product object being edited/deleted, or a new empty product for 'Add'
}

@Component({
  selector: 'app-product-dialog',
  templateUrl: './product-dialog.component.html',
  styleUrls: ['./product-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // Use FormsModule
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDialogClose,
    MatCheckboxModule,
    MaterialModule, 
    ReactiveFormsModule
  ]
})
export class ProductDialogComponent implements OnInit {
  action: string;
  local_data: Product; // Use 'Product' type directly

  constructor(
    public dialogRef: MatDialogRef<ProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.action = data.action;
    // Create a copy to avoid modifying the original object directly until saved
    this.local_data = { ...data.product };
  }

  ngOnInit(): void {
    if (this.action === 'Add') {
      const prefilledName = this.local_data.name;

      this.local_data = {
        id: 0,
        name: prefilledName || '', // <-- Use the saved name here
        description: '',
        isActive: true,
        defaultWarrantyDuration: null,  
        defaultWarrantyUnit: 'Months'   
      } as Product;
    }
  }

  doAction(): void {
    // Emit the action and the data back to the parent component
    this.dialogRef.close({ event: this.action, data: this.local_data });
  }

  closeDialog(): void {
    this.dialogRef.close({ event: 'Cancel' });
  }
}