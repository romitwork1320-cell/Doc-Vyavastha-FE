import { Component, EventEmitter, Input, Output, OnInit, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, AbstractControl, FormArray, Validators } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ReplacedItemFormGroup } from '../replacement-product-dialog.component';
import { ClipboardHelperService } from 'src/app/services/clipboard-helper.service';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-replacement-update-table',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MaterialModule, 
    MatAutocompleteModule, MatTooltipModule, MatIconModule, MatButtonModule, TablerIconsModule
  ],
  templateUrl: './replacement-update-table.component.html',
  styleUrls: ['./replacement-update-table.component.scss']
})
export class ReplacementUpdateTableComponent implements OnInit, OnChanges {
  @Input() parentForm!: FormGroup;
  @Input() canAddNewProductsInUpdateMode: boolean = false;
  @Input() tenantUsers: any[] = [];
  @Input() datePipe: any;
  @Input() productStatuses: any[] = [];
  @Input() nonProductStatuses: any[] = [];
  @Input() statusOrder: { [key: number]: number } = {};
  @Input() filteredContacts!: Observable<any[]>;

  @Output() requestAddNewItem = new EventEmitter<void>();
  @Output() requestRemoveNewItem = new EventEmitter<number>();
  @Output() requestRemoveExistingItem = new EventEmitter<number>();
  @Output() requestDuplicateNewItem = new EventEmitter<number>();
  @Output() requestDuplicateExistingItem = new EventEmitter<number>();

  selectedIndex: number | null = null;

  get replacedItems(): FormArray { return this.parentForm.get('replacedItems') as FormArray; }
  get newItems(): FormArray { return this.parentForm.get('newlyAddedItems') as FormArray; }

  constructor(private clipboardHelper: ClipboardHelperService) {}

  ngOnInit(): void {
    // Initial logic run on load
    this.runFieldLogic();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productStatuses'] || changes['parentForm']) {
      this.runFieldLogic();
    }
  }

  runFieldLogic(): void {
    if (this.replacedItems && this.replacedItems.controls) {
      this.replacedItems.controls.forEach(control => {
        const group = control as FormGroup;
        // We only run logic if the control exists to prevent errors during teardown
        if(group.get('productStatusControl')) {
            this.updateNotesValidator(group);
            this.onProductStatusChange(group);
        }
      });
    }
  }

  onProductStatusChange(group: FormGroup): void {
    const productStatusVal = group.get('productStatusControl')?.value;
    
    let statusName = '';
    
    // 1. Try resolving name from the form value (Object or ID)
    if (productStatusVal) {
        if (productStatusVal.statusName) {
            statusName = productStatusVal.statusName;
        } 
        else if (this.productStatuses && this.productStatuses.length) {
            const idToCheck = (typeof productStatusVal === 'object') ? productStatusVal.id : productStatusVal;
            const found = this.productStatuses.find(s => s.id == idToCheck);
            if (found) statusName = found.statusName;
        }
    }

    // 2. Fallback: Check Original Item (API Data) attached to Form Group
    // Crucial for initial load if dropdowns aren't matched yet
    if (!statusName) {
        const originalItem = (group as any).originalItem;
        const currentValId = (typeof productStatusVal === 'object') ? productStatusVal?.id : productStatusVal;
        
        if (originalItem && originalItem.productStatusId == currentValId) {
            statusName = originalItem.productStatusName;
        }
    }
    
    statusName = statusName?.toLowerCase().trim() || '';

    const newSerialCtrl = group.get('newSerialNoControl');
    const serviceInvCtrl = group.get('serviceInvoiceNoControl');
    const givenByCtrl = group.get('givenByControl');
    const receivedByCtrl = group.get('receivedByControl');
    
    const upgradeCheckboxCtrl = group.get('upgradeProductControl');
    const upgradedProductCtrl = group.get('upgradedProductControl');

    // --- 1. New Serial & Upgrade ---
    if (statusName === 'not accepted' || statusName === 'repair') {
      newSerialCtrl?.disable({ emitEvent: false });
      newSerialCtrl?.setValue('', { emitEvent: false });

      upgradeCheckboxCtrl?.disable({ emitEvent: false });
      upgradeCheckboxCtrl?.setValue(false, { emitEvent: false });
      upgradedProductCtrl?.disable({ emitEvent: false });
      upgradedProductCtrl?.setValue('', { emitEvent: false });

    } else {
      // Handles standard "Replace"
      newSerialCtrl?.enable({ emitEvent: false });

      upgradeCheckboxCtrl?.enable({ emitEvent: false });
      if (upgradeCheckboxCtrl?.value) {
          upgradedProductCtrl?.enable({ emitEvent: false });
      }
    }

    // --- 2. Service Invoice No ---
    // ✨ FIX: "Table Replace" means on-spot swap, so NO service invoice needed.
    if (statusName === 'not accepted' || statusName === 'table replace') {
      serviceInvCtrl?.disable({ emitEvent: false });
      // Clear valid only if disabled to prevent stale data
      if (serviceInvCtrl?.value) serviceInvCtrl?.setValue('', { emitEvent: false }); 
    } else {
      serviceInvCtrl?.enable({ emitEvent: false });
    }

    // --- 3. Internal Handover Fields ---
    const mainStatus = group.get('statusControl')?.value?.statusName?.toLowerCase();
    
    if (statusName === 'not accepted') {
        givenByCtrl?.disable({ emitEvent: false });
        receivedByCtrl?.disable({ emitEvent: false });
    } else {
        if (mainStatus && mainStatus !== 'pending') {
            givenByCtrl?.enable({ emitEvent: false });
            receivedByCtrl?.enable({ emitEvent: false });
        }
    }
  }

  updateNotesValidator(group: FormGroup): void {
    const statusControl = group.get('statusControl');
    const notesControl = group.get('notesControl');

    if (!statusControl || !notesControl) return;

    const statusVal = statusControl.value;
    const statusName = statusVal?.statusName?.toLowerCase() || '';
    
    if (statusName === 'completed') {
      notesControl.setValidators([Validators.required]);
    } else {
      notesControl.setValidators(null);
    }
    notesControl.updateValueAndValidity({ emitEvent: false }); // Prevent loops
  }

  selectRow(index: number): void {
    this.selectedIndex = this.selectedIndex === index ? null : index;
  }

  toggleCollapseNewItem(itemGroup: AbstractControl): void {
     const currentGroup = itemGroup as ReplacedItemFormGroup;
     const isCurrentlyCollapsed = currentGroup.isCollapsed;
     this.newItems.controls.forEach(control => { (control as ReplacedItemFormGroup).isCollapsed = true; });
     currentGroup.isCollapsed = !isCurrentlyCollapsed;
  }

  asFormGroup(control: AbstractControl): FormGroup { return control as FormGroup; }
  asReplacedItemFormGroup(control: AbstractControl): ReplacedItemFormGroup { return control as ReplacedItemFormGroup; }

  canDuplicate(itemGroup: AbstractControl): boolean {
    const group = itemGroup as FormGroup;
    
    // If the entire group is valid, we can definitely duplicate
    if (group.valid) {
        return true;
    }

    // If invalid, check if the ONLY reason it's invalid is the serialNoControl
    let isInvalidDueToOtherFields = false;
    
    for (const controlName in group.controls) {
      if (controlName === 'serialNoControl') continue; 
      
      const control = group.get(controlName);
      if (control && control.invalid) {
        isInvalidDueToOtherFields = true;
        break;
      }
    }
    
    return !isInvalidDueToOtherFields;
  }

  trackById(index: number, item: any): number { return item.id; }
  displayContactName(contact: any): string { return contact ? contact.name : ''; }
  displayProductName(product: any): string { return product ? (product.name || product) : ''; }
  displaySerialNumber(val: any): string { return (val && typeof val === 'object') ? val.serialNo : val || ''; }
  displayServiceCenterName(center: any): string { return center ? center.name : ''; }
  
  trackByUniqueId(index: number, item: AbstractControl): any {
    return item.get('_uniqueId')?.value;
  }

  getValidStatusOptions(itemGroup: FormGroup): any[] {
     const originalItem = (itemGroup as any).originalItem;
     const originalStatus = originalItem?.status;
     if (!originalStatus || !originalStatus.id) return this.nonProductStatuses;
     const originalOrder = this.statusOrder[originalStatus.id];
     return this.nonProductStatuses.filter(status => {
        const currentOrder = this.statusOrder[status.id!];
        return currentOrder >= originalOrder;
     });
  }

  getStatusClasses(status: string): string {
    if (!status) return '';
    return status.toLowerCase().trim().replace(/\s+/g, '-');
  }

  getProductStatusClasses(status: string): string {
    if (!status) return '';
    return status.toLowerCase().trim().replace(/\s+/g, '-');
  }

  copyToClipboard(text: any): void {
    this.clipboardHelper.copy(text);
  }
}