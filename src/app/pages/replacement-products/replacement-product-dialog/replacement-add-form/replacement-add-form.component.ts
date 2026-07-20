import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, AbstractControl, FormArray } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Observable } from 'rxjs';
import { ReplacedItemFormGroup } from '../replacement-product-dialog.component';
import { TablerIconsModule } from 'angular-tabler-icons'; // Added

@Component({
  selector: 'app-replacement-add-form',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MaterialModule, 
    MatAutocompleteModule, 
    MatDatepickerModule,
    TablerIconsModule 
  ],
  templateUrl: './replacement-add-form.component.html',
  styleUrls: ['./replacement-add-form.component.scss']
})
export class ReplacementAddFormComponent {
  @Input() parentForm!: FormGroup;
  @Input() filteredContacts!: Observable<any[]>;
  @Input() datePipe: any;

  @Output() requestAddItem = new EventEmitter<void>();
  @Output() requestRemoveItem = new EventEmitter<number>();
  @Output() requestDuplicateItem = new EventEmitter<number>();

  get replacedItems(): FormArray {
    return this.parentForm.get('replacedItems') as FormArray;
  }

  asReplacedItemFormGroup(control: AbstractControl): ReplacedItemFormGroup {
    return control as ReplacedItemFormGroup;
  }

  toggleCollapse(itemGroup: AbstractControl): void {
    const currentGroup = itemGroup as ReplacedItemFormGroup;
    const isCurrentlyCollapsed = currentGroup.isCollapsed;
    
    this.replacedItems.controls.forEach(control => {
      (control as ReplacedItemFormGroup).isCollapsed = true;
    });
    
    currentGroup.isCollapsed = !isCurrentlyCollapsed;
  }

  getProductNameForHeader(itemGroup: AbstractControl): string {
    const productControl = itemGroup.get('productControl')?.value;
    return (productControl && typeof productControl === 'object') ? productControl.name : 'Product Details';
  }

  trackById(index: number, item: any): number { return item.id; }
  displayContactName(contact: any): string { return contact ? (contact.name || contact) : ''; }
  displayProductName(product: any): string { return product ? (product.name || product) : ''; }
  displaySerialNumber(val: any): string { return (val && typeof val === 'object') ? val.serialNo : val || ''; }
  displayServiceCenterName(center: any): string { return center ? (center.name || center) : ''; }
}