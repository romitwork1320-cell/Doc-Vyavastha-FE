import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_FORMATS, MAT_DATE_LOCALE, NativeDateAdapter, DateAdapter } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TablerIconsModule } from 'angular-tabler-icons';
import { debounceTime, switchMap, finalize, map, startWith, takeUntil } from 'rxjs/operators';
import { of, Observable, Subject } from 'rxjs';

import { BillingService, BillingDocumentDto } from '../../../../../services/billing.service';
import { ContactService, Contact } from '../../../../../services/contacts.service';
import { BillingItemDialogComponent } from './billing-item-dialog/billing-item-dialog.component';
// import { ContactDialogComponent } from '../../../../contacts/contact-dialog/contact-dialog.component';

@Component({
  selector: 'app-purchase-invoice-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatAutocompleteModule, MatSelectModule, MatSnackBarModule,
    MatProgressSpinnerModule, TablerIconsModule, MatDatepickerModule,
    MatNativeDateModule, MatTooltipModule
  ],
  templateUrl: './purchase-invoice-dialog.component.html',
  styleUrls: ['./purchase-invoice-dialog.component.scss'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    { provide: DateAdapter, useClass: NativeDateAdapter },
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: {
          dateInput: ['dd/MM/yyyy', 'dd-MM-yyyy'],
        },
        display: {
          dateInput: { day: '2-digit', month: '2-digit', year: 'numeric' },
          monthYearLabel: { month: 'short', year: 'numeric' },
          dateA11yLabel: { day: '2-digit', month: '2-digit', year: 'numeric' },
          monthYearA11yLabel: { month: 'long', year: 'numeric' },
        },
      },
    },
  ]
})

export class PurchaseInvoiceDialogComponent implements OnInit {
  invoiceForm: FormGroup;
  isSaving = false;
  isLoadingData = false;
  isEditMode = false;
  contactLinked = false;
  selectedVendor: any = null;  // holds full vendor details after selection
  autoInvoiceNo = '';          // display-only auto-generated number

  allContacts: Contact[] = [];
  filteredContacts!: Observable<Contact[]>;
  private destroy$ = new Subject<void>();

  taxTypes = [
    { value: 'NoTax', label: 'None (No Tax)' },
    { value: 'LocalRegistered', label: 'Local — Registered' },
    { value: 'Outstate', label: 'Out-of-State (IGST)' },
    { value: 'ImportDeemed', label: 'Import — Deemed' },
    { value: 'ImportIGST', label: 'Import — with IGST' }
  ];

  discountModes = [
    { value: 'PerItem', label: 'Item Level (per line)' },
    { value: 'OnInvoice', label: 'Invoice Level (total)' }
  ];

  constructor(
    private fb: FormBuilder,
    private billingService: BillingService,
    private contactService: ContactService,
    private snackBar: MatSnackBar,
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<PurchaseInvoiceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number }
  ) {
    this.invoiceForm = this.fb.group({
      documentNo:   [{ value: '', disabled: true }],
      documentDate: [new Date(), Validators.required],
      dueDate:      [null],
      vendorRefNo:  [''],
      contactId:    [null],
      contactName:  ['', Validators.required],
      taxType:      ['NoTax', Validators.required],
      discountMode: ['PerItem', Validators.required],
      internalNotes:[''],

      basicAmount:  [{ value: 0, disabled: true }],
      totalDiscount:[{ value: 0, disabled: true }],
      roundOff:     [0],
      netPayable:   [{ value: 0, disabled: true }],

      items: this.fb.array([])
    });

    // Auto-generate a readable invoice number for new invoices
    if (!this.data?.id) {
      const today = new Date();
      const yy   = today.getFullYear().toString().slice(-2);
      const mm   = String(today.getMonth() + 1).padStart(2, '0');
      const rand = Math.floor(1000 + Math.random() * 9000);
      this.autoInvoiceNo = `PI-${yy}${mm}-${rand}`;
    }
  }

  ngOnInit(): void {
    this.invoiceForm.get('roundOff')?.valueChanges.subscribe(() => this.calculateTotals());

    // Load all contacts first, then setup filter (matches Replacement dialog pattern)
    this.contactService.getContacts({
      pageIndex: 0, pageSize: 10000, filter: '', sortColumn: 'Name', sortDirection: 'asc'
    }).subscribe(res => {
      this.allContacts = res.data || [];
      this.setupContactAutocomplete(); // ← set up AFTER contacts are loaded
    });

    if (this.data?.id) {
      this.isEditMode = true;
      this.loadInvoice(this.data.id);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  get canSave(): boolean {
    return !this.isSaving && this.invoiceForm.valid && this.items.length > 0;
  }

  get saveDisabledReason(): string {
    if (this.items.length === 0) return 'Add at least one line item to continue';
    if (this.invoiceForm.get('contactName')?.invalid) return 'Please select a vendor';
    return '';
  }

  setupContactAutocomplete() {
    this.filteredContacts = this.invoiceForm.get('contactName')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      map(value => {
        if (typeof value === 'string' && value.length === 0) return [];
        if (value === '*') return this.allContacts;
        
        const filteredList = this._filterContacts(value || '');

        if (typeof value === 'string' && value.trim().length > 0) {
          const exactMatch = this.allContacts.some(c => c.name.toLowerCase() === value.toLowerCase().trim());
          if (!exactMatch) {
            filteredList.push({
              id: -1,
              name: `Add Contact '${value}'`,
              contactNo: '', emailId: '', whatsAppNumber: '', isActive: true
            } as Contact);
          }
        }
        return filteredList;
      })
    );

    // Watch for "Add Contact" selection
    this.invoiceForm.get('contactName')!.valueChanges.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      if (typeof value === 'object' && value !== null && value.id === -1) {
        const newName = value.name.match(/'(.*?)'/)?.[1] || '';
        this.openNewContactDialog(newName);
      }
    });
  }

  private _filterContacts(value: any): Contact[] {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : '';
    return this.allContacts.filter(c => 
      c.name.toLowerCase().includes(filterValue) || 
      (c.contactNo && c.contactNo.includes(filterValue))
    );
  }

  displayContactName(contact: any): string {
    return contact ? (contact.name || contact) : '';
  }

  trackByContactId(index: number, contact: any): number { return contact.id; }

  openNewContactDialog(name: string): void {
    // const dialogRef = this.dialog.open(ContactDialogComponent, {
    //   width: '400px',
    //   data: { action: 'Add', contact: { name: name } }
    // });

    // dialogRef.afterClosed().subscribe((result) => {
    //   if (result) {
    //     // Refresh contacts list
    //     this.contactService.getContacts({
    //       pageIndex: 1, pageSize: 10000, filter: '', sortColumn: 'Name', sortDirection: 'asc'
    //     }).subscribe(res => {
    //       this.allContacts = res.data || [];
    //       // Select the newly created contact
    //       const newContact = this.allContacts.find(c => c.name === result.name);
    //       if (newContact) {
    //         this.invoiceForm.get('contactName')?.setValue(newContact);
    //       }
    //     });
    //   } else {
    //     // Reset if cancelled
    //     this.invoiceForm.get('contactName')?.setValue('');
    //   }
    // });
  }

  onContactSelected(event: any) {
    const contact = event.option.value;
    if (contact.id === -1) return; // Handled by valueChanges subscriber

    this.invoiceForm.patchValue({
      contactId: contact.id
    });
    this.contactLinked = true;
    this.selectedVendor = contact;   // store for the vendor info card
  }

  loadInvoice(id: number) {
    this.isLoadingData = true;
    this.billingService.getById(id)
      .pipe(finalize(() => this.isLoadingData = false))
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            const data = res.data;
            this.invoiceForm.patchValue({
              documentNo:   data.documentNo,
              documentDate: new Date(data.documentDate),
              dueDate:      data.dueDate ? new Date(data.dueDate) : null,
              vendorRefNo:  data.vendorRefNo,
              contactId:    data.contactId,
              contactName:  data.contactName,
              taxType:      data.taxType,
              discountMode: data.discountMode,
              internalNotes:data.internalNotes,
              basicAmount:  data.basicAmount,
              totalDiscount:data.totalDiscount,
              roundOff:     data.roundOff,
              netPayable:   data.netPayable
            });
            if (data.contactId) {
              this.contactLinked = true;
              this.selectedVendor = { id: data.contactId, name: data.contactName, contactNo: data.contactPhone };
            }
            this.autoInvoiceNo = data.documentNo || '';

            if (data.items?.length > 0) {
              this.items.clear();
              data.items.forEach((item: any) => this.items.push(this.createItemFormGroup(item)));
            }
          }
        },
        error: () => this.snackBar.open('Failed to load invoice', 'Close', { duration: 3000 })
      });
  }

  createItemFormGroup(itemData?: any): FormGroup {
    return this.fb.group({
      id:             [itemData?.id || 0],
      productId:      [itemData?.productId || null],
      itemName:       [itemData?.itemName || '', Validators.required],
      qty:            [itemData?.qty || 1, [Validators.required, Validators.min(0.001)]],
      rateWithoutTax: [itemData?.rateWithoutTax || 0, Validators.required],
      discountValue:  [itemData?.discountValue || 0],
      discountType:   [itemData?.discountType || '%'],
      taxPercent:     [itemData?.taxPercent || 0],
      totalAmount:    [itemData?.totalAmount || 0],
      description:    [itemData?.description || ''],
      sortOrder:      [itemData?.sortOrder || 0]
    });
  }

  openItemDialog(index?: number) {
    const itemData = index !== undefined ? this.items.at(index).value : null;
    const dialogRef = this.dialog.open(BillingItemDialogComponent, {
      width: '600px',
      maxWidth: '96vw',
      data: { item: itemData }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (index !== undefined) {
          this.items.at(index).patchValue(result);
        } else {
          result.sortOrder = this.items.length;
          this.items.push(this.createItemFormGroup(result));
        }
        this.calculateTotals();
      }
    });
  }

  removeItem(index: number) {
    this.items.removeAt(index);
    this.calculateTotals();
  }

  calculateTotals() {
    let basicTotal = 0;
    this.items.controls.forEach(control => {
      basicTotal += control.value.totalAmount || 0;
    });
    const roundOff = Number(this.invoiceForm.get('roundOff')?.value) || 0;

    this.invoiceForm.patchValue({
      basicAmount: basicTotal,
      netPayable:  basicTotal + roundOff
    }, { emitEvent: false });
  }

  save() {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      return;
    }
    this.isSaving = true;

    const formVal = this.invoiceForm.getRawValue();
    
    // Convert to local YYYY-MM-DD string to avoid UTC timezone shift during JSON serialization
    const formatLocal = (d: Date | null) => {
      if (!d) return null;
      const dt = new Date(d);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };

    const dto: BillingDocumentDto = {
      documentType:       'PurchaseInvoice',
      documentNo:         formVal.documentNo,
      documentDate:       formatLocal(formVal.documentDate) as string,
      dueDate:            formatLocal(formVal.dueDate),
      vendorRefNo:        formVal.vendorRefNo,
      contactId:          formVal.contactId,
      taxType:            formVal.taxType,
      discountMode:       formVal.discountMode,
      invoiceDiscountType:'%',
      basicAmount:        formVal.basicAmount,
      totalDiscount:      formVal.totalDiscount,
      roundOff:           formVal.roundOff,
      netPayable:         formVal.netPayable,
      internalNotes:      formVal.internalNotes,
      items:              formVal.items
    };

    const request = this.isEditMode
      ? this.billingService.update(this.data.id!, { ...dto, id: this.data.id })
      : this.billingService.create(dto);

    request.pipe(finalize(() => this.isSaving = false)).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.snackBar.open('Invoice saved successfully!', 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        } else {
          this.snackBar.open(res.message || 'Error saving invoice', 'Close', { duration: 4000 });
        }
      },
      error: () => this.snackBar.open('Network error. Please try again.', 'Close', { duration: 4000 })
    });
  }
}
