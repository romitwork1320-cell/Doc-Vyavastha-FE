import { CommonModule, DatePipe } from '@angular/common';
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MaterialModule } from 'src/app/material.module';
import { Observable, startWith, map, of, switchMap, debounceTime, Subject, takeUntil, catchError, combineLatest } from 'rxjs';

import { ContactService, Contact } from 'src/app/services/contacts.service';
import { Product, ProductService } from 'src/app/services/products.service';
import { InvoiceProduct, InvoiceProductService } from 'src/app/services/invoice-product.service';
import { ServiceCenter, ServiceCentersService } from 'src/app/services/service-centers.service';
import { Status, StatusService } from 'src/app/services/status.service';
import { ReplacementProductService, ReplacementRequestDto, ReplacementProductCreateDto, ReplacementProductUpdateDto, ReplacementUpdateDto } from 'src/app/services/replacement-product.service';
import { MatIconModule } from '@angular/material/icon';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { ApiResponse, PaginationRequestDto } from 'src/app/common/interfaces/common';
import { AuthService } from 'src/app/services/auth.service';
import { UserService, UserTenantLookupDto } from 'src/app/services/user.service';
import { MatTooltipModule } from '@angular/material/tooltip';

// Other Dialogs
import { ProductDialogComponent, DialogData as ProductDialogData } from '../../products/product-dialog/product-dialog.component';
import { ServiceCenterDialogComponent, DialogData as ServiceCenterDialogData } from '../../service-centers/service-center-dialog/service-center-dialog.component';
import { ReplacementUpdateTableComponent } from './replacement-update-table/replacement-update-table.component';
import { ReplacementAddFormComponent } from './replacement-add-form/replacement-add-form.component';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ConfirmationDialogComponent } from 'src/app/common/component/confirmation-dialog/confirmation-dialog.component';
import { DashboardService } from 'src/app/services/dashboard.service';

export const MY_DATE_FORMATS = {
  parse: { dateInput: 'DD-MM-YYYY' },
  display: { dateInput: 'DD-MM-YYYY', monthYearLabel: 'MMM YYYY', dateA11yLabel: 'LL', monthYearA11yLabel: 'MMMM YYYY' },
};

// --- Interfaces ---
export interface ReplacedItem {
  id?: number;
  product: Product;
  serialNo?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  warrantyDuration?: number;
  warrantyUnit?: string;
  warrantyDisplay?: string;
  serviceCenter?: ServiceCenter;
  status?: Status;
  isManualEntry?: boolean;
  newSerialNo?: string;
  manualWarrantyDuration?: number;
  manualWarrantyUnit?: string;
  serviceCenterName?: string;
  calculatedWarrantyEndDateControl?: string;
  notes?: string;
  serviceInvoiceNo?: string | undefined;
  productStatusName?: string;
  productStatusId?: number;
  isUpgraded?: boolean;
  upgradedProduct?: Product;
  givenByUserId?: number | null;
  receivedByUserId?: number | null;
}

export interface Replacement {
  id?: number;
  contact: Contact;
  replacedItems: ReplacedItem[];
  status?: Status;
  invertNo?: string;
  note?: string;
}

export interface DialogData {
  id?: number;
  action: string;
  replacement?: Replacement;
  local_data?: string | number;
}

export interface ReplacedItemFormGroup extends FormGroup {
  filteredProducts?: Observable<Product[]>;
  allSerialNumbersForProduct?: InvoiceProduct[];
  filteredSerialNumbers?: Observable<InvoiceProduct[]>;
  filteredServiceCenters?: Observable<ServiceCenter[]>;
  selectedServiceCenter?: ServiceCenter | null;
  isManualEntry?: boolean;
  hasHistory?: boolean;
  historyData?: any[];
  isCollapsed?: boolean;
  originalItem?: any;
}

export const statusHierarchyValidator = (originalStatusId: number, statusOrder: { [key: number]: number }): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value || typeof control.value !== 'object' || !originalStatusId) return null;
    const currentStatusId = control.value.id;
    const originalOrder = statusOrder[originalStatusId];
    const currentOrder = statusOrder[currentStatusId];
    if (originalOrder && currentOrder && currentOrder < originalOrder) return { statusHierarchy: true };
    return null;
  };
};

@Component({
  selector: 'app-replacement-product-dialog',
  templateUrl: './replacement-product-dialog.component.html',
  styleUrls: ['./replacement-product-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    ReplacementAddFormComponent,
    ReplacementUpdateTableComponent,
    TablerIconsModule
  ],
  providers: [
    DatePipe,
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
  ],
})
export class ReplacementProductDialogComponent implements OnInit, OnDestroy {
  private uniqueIdCounter = 0;
  action: string;
  local_data: string | number | undefined;
  invertNo: string | undefined;
  currentUserId: number = 0;

  replacementForm!: FormGroup;
  canAddNewProductsInUpdateMode: boolean = false;

  allContacts: Contact[] = [];
  filteredContacts!: Observable<Contact[]>;
  selectedContact: Contact | null = null;

  allProducts: Product[] = [];
  allServiceCenters: ServiceCenter[] = [];
  allStatuses: Status[] = [];
  nonProductStatuses: Status[] = [];
  productStatuses: Status[] = [];
  pendingStatus: Status | undefined;
  replaceStatus: Status | undefined;
  
  statusOrder: { [key: number]: number } = {};
  allInvoiceProductsForContact: InvoiceProduct[] = [];
  tenantUsers: UserTenantLookupDto[] = [];

  private destroy$ = new Subject<void>();

  contactRequest: PaginationRequestDto = { pageIndex: 0, pageSize: 10000, filter: '', sortColumn: 'Id', sortDirection: 'asc' };
  productRequest: PaginationRequestDto = { pageIndex: 0, pageSize: 10000, filter: '', sortColumn: 'Id', sortDirection: 'asc' };
  serviceCenterRequest: PaginationRequestDto = { pageIndex: 0, pageSize: 10000, filter: '', sortColumn: 'Id', sortDirection: 'asc' };

  constructor(
    public dialogRef: MatDialogRef<ReplacementProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private fb: FormBuilder,
    private contactService: ContactService,
    private invoiceProductService: InvoiceProductService,
    private serviceCentersService: ServiceCentersService,
    private statusService: StatusService,
    private replacementProductService: ReplacementProductService,
    private productsService: ProductService,
    public datePipe: DatePipe,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private dialog: MatDialog,
    private userService: UserService,
    private dashboardService: DashboardService
  ) {
    this.action = data.action;

    if (this.action === 'Update') {
      this.replacementForm = this.fb.group({
        contactSearchControl: [{ value: '', disabled: false }],
        contactNumberControl: [{ value: '', disabled: true }],
        whatsAppNumberControl: [''],
        replacedItems: this.fb.array([]),
        newlyAddedItems: this.fb.array([])
      });
    } else {
      this.replacementForm = this.fb.group({
        contactSearchControl: ['', Validators.required],
        contactNumberControl: [{ value: '', disabled: true }],
        whatsAppNumberControl: [''],
        statusControl: [''],
        replacedItems: this.fb.array([])
      });
    }

    if (this.action === 'Delete' || this.action === 'Restore') {
      this.local_data = data.local_data;
    }
  }

  get statusControl(): FormControl { return this.replacementForm.get('statusControl') as FormControl; }
  get contactNumberControl(): FormControl { return this.replacementForm.get('contactNumberControl') as FormControl; }
  get contactSearchControl(): FormControl { return this.replacementForm.get('contactSearchControl') as FormControl; }
  get replacedItems(): FormArray { return this.replacementForm.get('replacedItems') as FormArray; }
  get newItems(): FormArray { return this.replacementForm.get('newlyAddedItems') as FormArray; }

  ngOnInit(): void {
    const userId = this.authService.getUserId();
    if (userId) {
      this.currentUserId = userId;
    }

    if (this.action === 'Delete') return;

    if (this.action === 'Update') {
      try {
        if (this.authService.hasPermission('/replacements', 'CanAdd')) {
          this.canAddNewProductsInUpdateMode = true;
        } else {
          this.canAddNewProductsInUpdateMode = false;
        }
      } catch (e) {
        console.error("Permission check failed", e);
        this.canAddNewProductsInUpdateMode = false;
      }
    }

    this.setupContactSelectionListener();

    combineLatest([
      this.statusService.getAllStatuses().pipe(catchError(() => of({ data: [] }))),
      this.contactService.getContacts(this.contactRequest).pipe(catchError(() => of({ data: [] }))),
      this.productsService.getProducts(this.productRequest).pipe(catchError(() => of({ data: [] }))),
      this.serviceCentersService.getServiceCenters(this.serviceCenterRequest).pipe(catchError(() => of({ data: [] }))),
      this.userService.getTenantUsersLookup().pipe(catchError(() => of({ data: [] })))
    ]).pipe(takeUntil(this.destroy$)).subscribe(([statusRes, contactRes, productRes, serviceCenterRes, userRes]) => {
      
      this.allStatuses = statusRes.data || [];
      this.nonProductStatuses = this.allStatuses.filter(s => s.isProduct !== true);
      this.productStatuses = this.allStatuses.filter(s => s.isProduct === true);
      this.pendingStatus = this.allStatuses.find(s => s.statusName.toLowerCase() === 'pending');
      
      this.allStatuses.forEach(s => {
        const statusName = s.statusName.toLowerCase();
        if (statusName === 'pending') this.statusOrder[s.id!] = 1;
        else if (statusName === 'in progress') this.statusOrder[s.id!] = 2;
        else if (statusName === 'ready') this.statusOrder[s.id!] = 3;
        else if (statusName === 'completed') this.statusOrder[s.id!] = 4;
      });

      if (this.action === 'Add' && this.pendingStatus) {
        this.statusControl.setValue(this.pendingStatus);
        this.statusControl.disable();
      }

      this.allContacts = contactRes.data || [];
      this.setupContactFilter();

      this.allProducts = productRes.data || [];
      this.allServiceCenters = serviceCenterRes.data || [];
      this.tenantUsers = (userRes as any).data || [];

      if (this.action === 'Update') {
        if (this.data.replacement?.contact) {
          this.selectedContact = this.data.replacement.contact;
          if (this.selectedContact && this.selectedContact.id) { 
            this.loadInvoiceProductsForContact(this.selectedContact.id)
                .subscribe(res => this.allInvoiceProductsForContact = res);
          }
        }
        if (this.data.replacement?.invertNo) {
          this.invertNo = this.data.replacement.invertNo;
          this.loadReplacementData(this.invertNo);
        }
      } else if (this.action === 'Add') {
        if (this.replacedItems.length === 0) {
          this.onAddReplacementItem();
        }
      }
    });
  }

  onAddReplacementItem(): void {
    this.replacedItems.controls.forEach(c => (c as ReplacedItemFormGroup).isCollapsed = true);
    const newGroup = this.createReplacedItemFormGroup(undefined, true);
    this.replacedItems.push(newGroup);
  }

  onRemoveReplacementItem(index: number): void {
    if (this.replacedItems.length > 1) {
      this.replacedItems.removeAt(index);
    }
  }

  onAddNewProductItemInUpdate(): void {
    this.newItems.controls.forEach(c => (c as ReplacedItemFormGroup).isCollapsed = true);
    const newGroup = this.createReplacedItemFormGroup(undefined, true);
    this.newItems.push(newGroup);
  }

  onRemoveNewReplacementItemInUpdate(index: number): void {
    this.newItems.removeAt(index);
  }

  onRemoveExistingItemInUpdate(index: number): void {
    const itemGroup = this.replacedItems.at(index);
    const itemId = itemGroup.get('id')?.value;
    const productName = itemGroup.get('productControl')?.value?.name || 'Item';

    if (!itemId) {
      this.replacedItems.removeAt(index);
      return;
    }

    // CASE 1: Single Product (Last Item) -> Delete Whole Request
    if (this.replacedItems.length === 1) {
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        width: '450px',
        data: {
          title: 'Delete Replacement Request',
          message: `Are you sure you want to delete '${productName}'?`,
          subMessage: `This is the last item. The entire Replacement Request (${this.invertNo}) will be moved to the Recycle Bin.`,
          confirmButtonText: 'Delete Request',
          confirmButtonColor: 'warn',
          type: 'error'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          if (!this.currentUserId) {
            this.snackBar.open('Error: User session invalid.', 'Dismiss');
            return;
          }

          this.replacementProductService.deleteReplacementByInvertNo(this.invertNo!, this.currentUserId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (res) => {
                if (res.success) {
                  this.snackBar.open('Replacement moved to Recycle Bin', 'Dismiss', { duration: 3000, panelClass: ['success-snackbar'] });
                  
                  this.dialogRef.close({ event: 'Delete', data: this.invertNo });
                } else {
                  this.snackBar.open('Failed: ' + res.message, 'Dismiss', { duration: 3000, panelClass: ['error-snackbar'] });
                }
              },
              error: (err) => {
                this.snackBar.open('Error deleting request', 'Dismiss', { panelClass: ['error-snackbar'] });
              }
            });
        }
      });
      return;
    }

    // CASE 2: Multiple Products -> Delete Single Item
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      data: {
        title: 'Remove Product',
        message: `Are you sure you want to remove '${productName}'?`,
        subMessage: 'This item will be removed from the replacement list immediately.',
        confirmButtonText: 'Remove',
        confirmButtonColor: 'warn',
        type: 'warning'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.replacementProductService.deleteSingleReplacementProduct(itemId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              if (res.success) {
                this.snackBar.open('Product removed successfully', 'Dismiss', { duration: 3000, panelClass: ['success-snackbar'] });
                this.replacedItems.removeAt(index);
                
              } else {
                this.snackBar.open('Failed to remove product: ' + res.message, 'Dismiss', { panelClass: ['error-snackbar'] });
              }
            },
            error: (err) => {
              this.snackBar.open('Error removing product', 'Dismiss', { panelClass: ['error-snackbar'] });
            }
          });
      }
    });
  }

  setupContactFilter(): void {
    this.filteredContacts = this.contactSearchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      map((value) => {
        if (typeof value === 'string' && value.length === 0) return [];
        if (value === '*') return this.allContacts;
        
        return this._filterContacts(value || '');
      })
    );
  }

  setupContactSelectionListener(): void {
    this.contactSearchControl.valueChanges.pipe(
      debounceTime(300),
      switchMap((value) => {
        this.allInvoiceProductsForContact = [];
        
        if (typeof value === 'object' && value !== null && typeof value.id === 'number') {
          this.selectedContact = { ...value };
          this.contactNumberControl.setValue(value.contactNo || '');
          this.replacementForm.get('whatsAppNumberControl')?.setValue((value as any).whatsAppNumber || '');
          this.contactNumberControl.disable();
          return this.loadInvoiceProductsForContact(value.id);
        } else {
          this.selectedContact = null;
          this.contactNumberControl.setValue('');
          this.contactNumberControl.enable();
          this.replacementForm.get('whatsAppNumberControl')?.setValue('');
          return of([]);
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe(invoiceProducts => {
      this.allInvoiceProductsForContact = invoiceProducts;
    });
  }

  loadReplacementData(invertNo: string): void {
    this.replacementProductService.getReplacementProductsByInvertNo(invertNo).subscribe({
      next: (apiResponse) => {
        if (apiResponse?.data && apiResponse.data.length > 0) {
          const items = apiResponse.data;
          const firstItem = items[0];
          
          // 1. Prepare Contact Object
          const contact = {
            id: firstItem.contactId,
            name: firstItem.contactName,
            contactNo: firstItem.contactNo,
            whatsAppNumber: (firstItem as any).whatsAppNumber, 
            emailId: (firstItem as any).contactEmailId,
            isActive: true
          };
          
          // 2. Set Form Controls (Silently)
          this.contactSearchControl.setValue(contact, { emitEvent: false });
          this.selectedContact = contact;
          this.contactNumberControl.setValue(contact.contactNo || '');
          this.replacementForm.get('whatsAppNumberControl')?.setValue((firstItem as any).whatsAppNumber || '');
          this.contactNumberControl.disable();

          // 3. ✅ FIX: Manually fetch Invoice History & WAIT before building rows
          if (contact.id) {
             this.loadInvoiceProductsForContact(contact.id).subscribe(invoiceProducts => {
                 // Store the data so dropdowns can use it immediately
                 this.allInvoiceProductsForContact = invoiceProducts;
                 
                 // Now that we have the history, build the rows
                 this._populateReplacedItems(items); 
             });
          } else {
             // Fallback (unlikely in update)
             this._populateReplacedItems(items);
          }
        }
      },
      error: (err) => {
        console.error('Failed to load replacement products:', err);
        this.snackBar.open('Failed to load details.', 'Dismiss', { duration: 3000 });
      }
    });
  }

  private _populateReplacedItems(items: any[]): void {
    this.replacedItems.clear();

    items.forEach(item => {
      const mainStatus = this.nonProductStatuses.find(s => s.id === item.statusId);
      const productStatus = this.productStatuses.find(s => s.id === item.productStatusId);
      const serviceCenter = this.allServiceCenters.find(sc => sc.name === item.serviceCenterName);
      const upgradedProduct = item.isUpgraded ? this.allProducts.find(p => p.id === item.upgradedProductId) : undefined;

      const realProductId = (item as any).originalProductId || item.invoiceProductId;

      const replacedItem: ReplacedItem = {
        id: item.id,
        product: { 
            id: realProductId, 
            name: item.productName, 
            isActive: true 
        },
        serialNo: item.oldSerialNo,
        invoiceNo: item.invoiceNo, 
        invoiceDate: item.invoiceDate,
        warrantyDuration: item.warrantyDuration, 
        warrantyUnit: item.warrantyUnit,
        warrantyDisplay: this.formatWarranty(item.warrantyDuration, item.warrantyUnit),
        serviceCenterName: item.serviceCenterName, 
        serviceCenter: serviceCenter,
        status: mainStatus, 
        serviceInvoiceNo: item.serviceInvoiceNo,
        productStatusId: item.productStatusId, 
        productStatusName: item.productStatusName,
        newSerialNo: item.newSerialNo, 
        notes: item.note,
        isUpgraded: item.isUpgraded, 
        upgradedProduct: upgradedProduct,
        givenByUserId: (item as any).givenByUserId, 
        receivedByUserId: (item as any).receivedByUserId
      };

      const newFormGroup = this.createReplacedItemFormGroup(replacedItem);
      this.replacedItems.push(newFormGroup);
    });

    this.replacedItems.controls.forEach(ctrl => {
      this._triggerRecalculation(ctrl as FormGroup);
      ctrl.markAllAsTouched();
    });
  }

  createReplacedItemFormGroup(item?: ReplacedItem, forceAddMode: boolean = false): FormGroup {
    const isManualEntry = !item?.serialNo || !this.allInvoiceProductsForContact.some(ip => ip.serialNo === item.serialNo && ip.productId === item.product.id);
    const isAddMode = (this.action === 'Add' || forceAddMode);
    const initialStatus = isAddMode ? this.pendingStatus : item?.status;
    const statusValidators = isAddMode ? [Validators.required] : [Validators.required, statusHierarchyValidator(item?.status?.id!, this.statusOrder)];

    const group = this.fb.group({
      _uniqueId: [this.uniqueIdCounter++],
      id: [{ value: item?.id || null, disabled: true }],
      productControl: [{ value: item?.product || '', disabled: false }, Validators.required],
      serialNoControl: [{ value: item?.serialNo || '', disabled: false }, Validators.required],
      statusControl: [{ value: initialStatus || '', disabled: isAddMode }, statusValidators],
      newSerialNoControl: [{ value: item?.newSerialNo || '', disabled: true }, Validators.required],
      invoiceNoControl: [{ value: item?.invoiceNo || '', disabled: !isManualEntry }, Validators.required],
      invoiceDateControl: [{ value: item?.invoiceDate || '', disabled: !isManualEntry }, Validators.required],
      warrantyDisplayControl: [{ value: '', disabled: true }],
      manualWarrantyDurationControl: [{ value: '', disabled: !isManualEntry }, [Validators.required, Validators.min(0)]],
      manualWarrantyUnitControl: [{ value: '', disabled: !isManualEntry }, Validators.required],
      serviceCenterSearchControl: [{ value: item?.serviceCenter || '', disabled: false }, Validators.required],
      serviceCenterName: [{ value: item?.serviceCenterName, disabled: true }],
      calculatedWarrantyEndDateControl: [{ value: '', disabled: true }],
      isUnderWarrantyControl: [true],
      notesControl: [item?.notes || '', []],
      productStatusControl: [{ value: item?.productStatusId ? this.productStatuses.find(s => s.id === item.productStatusId) : null, disabled: true }],
      serviceInvoiceNoControl: [{ value: '', disabled: true }],
      upgradeProductControl: [{ value: item?.isUpgraded || false, disabled: true }],
      upgradedProductControl: [{ value: item?.upgradedProduct || '', disabled: true }],
      givenByControl: [{ value: item?.givenByUserId, disabled: true }],
      receivedByControl: [{ value: item?.receivedByUserId, disabled: true }]
    });

    if (item && !forceAddMode) {
      const productStatus = this.productStatuses.find(s => s.id === item.productStatusId);
      if (productStatus) group.get('productStatusControl')?.setValue(productStatus, { emitEvent: false });
      if (item.upgradedProduct) group.get('upgradedProductControl')?.setValue(item.upgradedProduct, { emitEvent: false });
      
      group.get('serviceInvoiceNoControl')?.setValue(item.serviceInvoiceNo || null, { emitEvent: false });
      if (item.givenByUserId) group.get('givenByControl')?.setValue(item.givenByUserId, { emitEvent: false });
      if (item.receivedByUserId) group.get('receivedByControl')?.setValue(item.receivedByUserId, { emitEvent: false });
    }

    (group as ReplacedItemFormGroup).isManualEntry = isManualEntry;
    (group as any).originalItem = item;
    (group as ReplacedItemFormGroup).isCollapsed = false;

    this._setReplacedItemInitialValues(group, item, forceAddMode);
    this.setupProductAndSerialAutocomplete(group as ReplacedItemFormGroup);
    this.setupServiceCenterAutocomplete(group as ReplacedItemFormGroup);
    this._setupWarrantyCalculationListener(group);
    this._setupStatusAndNotesControlListener(group as ReplacedItemFormGroup, item, forceAddMode);
    this._setupStatusListeners(group as ReplacedItemFormGroup, item, forceAddMode);

    group.updateValueAndValidity();
    return group;
  }

  private _setReplacedItemInitialValues(group: FormGroup, item?: ReplacedItem, forceAddMode: boolean = false): void {
    const matchedIp = item?.serialNo ? this.allInvoiceProductsForContact.find(ip => ip.serialNo === item.serialNo && ip.productId === item.product.id) : undefined;

    if (item?.product?.id) {
        group.get('productControl')?.setValue(item.product, { emitEvent: false });
        
        // ✅ FIX: Manually filter serials for THIS row so the dropdown works immediately
        (group as ReplacedItemFormGroup).allSerialNumbersForProduct = this.allInvoiceProductsForContact.filter(
            (ip) => ip.productId === item.product.id && ip.contactId === this.selectedContact?.id
        );
    }

    if (matchedIp) group.get('serialNoControl')?.setValue(matchedIp, { emitEvent: false });
    else if (item?.serialNo) group.get('serialNoControl')?.setValue(item.serialNo, { emitEvent: false });

    if (item?.newSerialNo) group.get('newSerialNoControl')?.setValue(item.newSerialNo, { emitEvent: false });
    if (item?.serviceCenter) group.get('serviceCenterSearchControl')?.setValue(item.serviceCenter, { emitEvent: false });

    const invoiceNo = group.get('invoiceNoControl')!;
    const invoiceDate = group.get('invoiceDateControl')!;
    const wDuration = group.get('manualWarrantyDurationControl')!;
    const wUnit = group.get('manualWarrantyUnitControl')!;

    const isManualEntry = (group as ReplacedItemFormGroup).isManualEntry;

    if (item && !forceAddMode) {
      invoiceNo.setValue(item.invoiceNo || '', { emitEvent: false });
      invoiceDate.setValue(item.invoiceDate ? new Date(item.invoiceDate) : null, { emitEvent: false });
      
      if (item.warrantyDuration && item.warrantyUnit) {
        group.get('warrantyDisplayControl')?.setValue(this.formatWarranty(item.warrantyDuration, item.warrantyUnit), { emitEvent: false });
      }
      wDuration.setValue(item.warrantyDuration, { emitEvent: false });
      wUnit.setValue(item.warrantyUnit, { emitEvent: false });

      if (!isManualEntry) {
        invoiceNo.disable();
        invoiceDate.disable();
        wDuration.disable();
        wUnit.disable();
      } else {
        // If manual, ensure they are enabled for correction
        invoiceNo.enable();
        invoiceDate.enable();
        wDuration.enable();
        wUnit.enable();
      }
    } else {
      invoiceNo.enable();
      invoiceDate.enable();
      group.get('warrantyDisplayControl')?.setValue('');
      wDuration.enable();
      wUnit.enable();
      wUnit.setValue('Months');
      wDuration.setValidators([Validators.required, Validators.min(0)]);
      wUnit.setValidators(Validators.required);
    }
  }

  setupProductAndSerialAutocomplete(itemGroup: ReplacedItemFormGroup): void {
    const productControl = itemGroup.get('productControl') as FormControl;
    const serialNoControl = itemGroup.get('serialNoControl') as FormControl;

    itemGroup.filteredProducts = productControl.valueChanges.pipe(
      startWith(productControl.value || ''),
      debounceTime(300),
      map(value => {
        if (typeof value === 'string' && value.length === 0) return [];
        
        const combinedList = (this.selectedContact && this.selectedContact.id !== null) 
          ? this._getCombinedProducts(this.selectedContact.id) : this.allProducts;
        
        if (value === '*') return combinedList;
        
        const filteredList = this._filterProducts(value || '', combinedList);
        
        if (typeof value === 'string' && value.trim().length > 0) {
          const exactMatch = combinedList.some(p => p.name.toLowerCase() === value.toLowerCase().trim());
          if (!exactMatch) {
            filteredList.push({ id: -1, name: `Add Product '${value}'`, isActive: true } as Product);
          }
        }
        return filteredList;
      })
    );

    productControl.valueChanges.pipe(debounceTime(300), switchMap(value => {
      if (typeof value === 'object' && value?.id === -1) {
        const newName = value.name.match(/'(.*?)'/)?.[1] || '';
        this.openNewProductDialog(newName, itemGroup);
        productControl.setValue('', { emitEvent: false });
        return of([]);
      }

      const forceClearSerial = typeof value !== 'object';
      this._resetSerialAndOtherFields(itemGroup, forceClearSerial);

      if (typeof value === 'object' && value?.id) {
        
        if (value.defaultWarrantyDuration) {
          itemGroup.get('manualWarrantyDurationControl')?.setValue(value.defaultWarrantyDuration, { emitEvent: false });
          itemGroup.get('manualWarrantyUnitControl')?.setValue(value.defaultWarrantyUnit || 'Months', { emitEvent: false });
          
          this._triggerRecalculation(itemGroup);
        }
        // -----------------------------------------------------

        itemGroup.allSerialNumbersForProduct = this.allInvoiceProductsForContact.filter(
          (ip) => ip.productId === value.id && ip.contactId === this.selectedContact?.id
        );
        return of(itemGroup.allSerialNumbersForProduct);
      }
      itemGroup.allSerialNumbersForProduct = [];
      return of([]);
    }), takeUntil(this.destroy$)).subscribe(() => {
       itemGroup.filteredSerialNumbers = serialNoControl.valueChanges.pipe(
         startWith(serialNoControl.value || ''),
         debounceTime(300),
         map(val => {
           if (typeof val === 'string' && val.length === 0) return [];
           if (val === '*') return itemGroup.allSerialNumbersForProduct || [];
           return this._filterSerialNumbers(val || '', itemGroup.allSerialNumbersForProduct || []);
         })
       );
    });

    serialNoControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      const isSelectedObject = typeof value === 'object' && value !== null;
      (itemGroup as ReplacedItemFormGroup).isManualEntry = !isSelectedObject && typeof value === 'string' && value.length > 0;
      this._updateControlStates(itemGroup, isSelectedObject ? value as InvoiceProduct : undefined);
    });
  }

  private _resetSerialAndOtherFields(itemGroup: ReplacedItemFormGroup, forceClearSerial: boolean): void {
    const serialNoControl = itemGroup.get('serialNoControl')!;
    const shouldClear = forceClearSerial || (typeof serialNoControl.value === 'object' && serialNoControl.value !== null);

    if (shouldClear) {
      serialNoControl.setValue('', { emitEvent: false });
      itemGroup.get('newSerialNoControl')?.setValue('', { emitEvent: false });
      itemGroup.get('invoiceNoControl')?.setValue('', { emitEvent: false });
      itemGroup.get('invoiceDateControl')?.setValue('', { emitEvent: false });
      itemGroup.get('warrantyDisplayControl')?.setValue('', { emitEvent: false });
      itemGroup.get('manualWarrantyDurationControl')?.setValue('', { emitEvent: false });
      itemGroup.get('manualWarrantyUnitControl')?.setValue('Months', { emitEvent: false });
      this._updateControlStates(itemGroup);
    }
    itemGroup.allSerialNumbersForProduct = [];
  }

  private _updateControlStates(group: FormGroup, invoiceProduct?: InvoiceProduct): void {
    const invoiceNo = group.get('invoiceNoControl')!;
    const invoiceDate = group.get('invoiceDateControl')!;
    const wDisplay = group.get('warrantyDisplayControl')!;
    const wDuration = group.get('manualWarrantyDurationControl')!;
    const wUnit = group.get('manualWarrantyUnitControl')!;

    if (invoiceProduct) {
      invoiceNo.setValue(invoiceProduct.invoiceNo, { emitEvent: false });
      invoiceDate.setValue(invoiceProduct.invoiceDate, { emitEvent: false });
      invoiceNo.disable();
      invoiceDate.disable();
      invoiceNo.clearValidators();
      invoiceDate.clearValidators();

      if (invoiceProduct.warrantyDuration && invoiceProduct.warrantyUnit) {
        wDisplay.setValue(this.formatWarranty(invoiceProduct.warrantyDuration, invoiceProduct.warrantyUnit), { emitEvent: false });
        wDuration.setValue(invoiceProduct.warrantyDuration, { emitEvent: false });
        wUnit.setValue(invoiceProduct.warrantyUnit, { emitEvent: false });
        wDuration.disable();
        wUnit.disable();
        wDuration.clearValidators();
        wUnit.clearValidators();
      } else {
        wDisplay.setValue('No records found', { emitEvent: false });
        wDuration.enable();
        wUnit.enable();
        wDuration.setValidators([Validators.required, Validators.min(0)]);
        wUnit.setValidators(Validators.required);
      }
      this._triggerRecalculation(group);
    } else {
      invoiceNo.enable();
      invoiceDate.enable();
      wDisplay.setValue('');
      wDuration.enable();
      wUnit.enable();
      invoiceNo.setValidators([Validators.required]);
      invoiceDate.setValidators([Validators.required]);
      wDuration.setValidators([Validators.required, Validators.min(0)]);
      wUnit.setValidators(Validators.required);
    }
    invoiceNo.updateValueAndValidity({ emitEvent: false });
    invoiceDate.updateValueAndValidity({ emitEvent: false });
    wDuration.updateValueAndValidity({ emitEvent: false });
    wUnit.updateValueAndValidity({ emitEvent: false });
  }

  setupServiceCenterAutocomplete(itemGroup: ReplacedItemFormGroup): void {
    const scControl = itemGroup.get('serviceCenterSearchControl') as FormControl;
    itemGroup.filteredServiceCenters = scControl.valueChanges.pipe(
      startWith(scControl.value || ''),
      debounceTime(300),
      map(value => {
        if (typeof value === 'string' && value.length === 0) return [];
        if (value === '*') return this.allServiceCenters;
        
        const filtered = this._filterServiceCenters(value || '');
        
        // FIX: Always allow adding if there isn't an EXACT match
        if (typeof value === 'string' && value.trim().length > 0) {
          const exactMatch = this.allServiceCenters.some(sc => sc.name?.toLowerCase() === value.toLowerCase().trim());
          if (!exactMatch) {
            filtered.push({ id: -1, name: `Add Service Center '${value}'`, isActive: true, address: '' } as ServiceCenter);
          }
        }
        return filtered;
      })
    );

    scControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      if (typeof value === 'object' && value?.id === -1) {
        const newName = value.name.match(/'(.*?)'/)?.[1] || '';
        this.openNewServiceCenterDialog(newName, itemGroup);
        scControl.setValue('', { emitEvent: false });
        return;
      }
      if (typeof value === 'object' && value !== null) itemGroup.selectedServiceCenter = { ...value };
      else if (typeof value === 'string') itemGroup.selectedServiceCenter = null;
    });
  }

  _setupWarrantyCalculationListener(itemGroup: FormGroup): void {
    const invoiceDate = itemGroup.get('invoiceDateControl')!;
    const duration = itemGroup.get('manualWarrantyDurationControl')!;
    const unit = itemGroup.get('manualWarrantyUnitControl')!;
    const endDateCtrl = itemGroup.get('calculatedWarrantyEndDateControl')!;
    const isUnderWarrantyCtrl = itemGroup.get('isUnderWarrantyControl')!;

    combineLatest([
      invoiceDate.valueChanges.pipe(startWith(invoiceDate.value)),
      duration.valueChanges.pipe(startWith(duration.value)),
      unit.valueChanges.pipe(startWith(unit.value))
    ]).pipe(takeUntil(this.destroy$)).subscribe(([d, dur, u]) => {
      let end: Date | null = null;
      if (d && dur && u) {
        end = this.calculateWarrantyEndDate(new Date(d), dur, u);
        endDateCtrl.setValue(end);
      } else {
        endDateCtrl.setValue(null);
      }
      isUnderWarrantyCtrl.setValue(this.checkWarrantyStatus(end));
    });
  }

  _triggerRecalculation(itemGroup: FormGroup): void {
    const invoiceDate = itemGroup.get('invoiceDateControl')?.value;
    const duration = itemGroup.get('manualWarrantyDurationControl')?.value;
    const unit = itemGroup.get('manualWarrantyUnitControl')?.value;
    let end: Date | null = null;
    if (invoiceDate && duration && unit) {
      end = this.calculateWarrantyEndDate(new Date(invoiceDate), duration, unit);
    }
    itemGroup.get('calculatedWarrantyEndDateControl')?.setValue(end);
    itemGroup.get('isUnderWarrantyControl')?.setValue(this.checkWarrantyStatus(end));
  }

  _setupStatusAndNotesControlListener(itemGroup: ReplacedItemFormGroup, originalItem?: ReplacedItem, forceAddMode: boolean = false): void {
    if (this.action !== 'Update' || forceAddMode) return;
    const originalStatus = originalItem?.status;
    itemGroup.get('statusControl')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(currentStatus => {
      const notesControl = itemGroup.get('notesControl')!;
      if (originalStatus?.id !== currentStatus?.id) notesControl.setValidators(Validators.required);
      else notesControl.clearValidators();
      notesControl.updateValueAndValidity();
    });
  }

  _setupStatusListeners(itemGroup: ReplacedItemFormGroup, originalItem?: ReplacedItem, forceAddMode: boolean = false): void {
    const statusControl = itemGroup.get('statusControl') as FormControl;
    const productStatusControl = itemGroup.get('productStatusControl') as FormControl;
    const serviceInvoiceNoControl = itemGroup.get('serviceInvoiceNoControl') as FormControl;
    const newSerialNoControl = itemGroup.get('newSerialNoControl') as FormControl;
    const upgradeProductControl = itemGroup.get('upgradeProductControl') as FormControl;
    const upgradedProductControl = itemGroup.get('upgradedProductControl') as FormControl;
    const givenByControl = itemGroup.get('givenByControl') as FormControl;
    const receivedByControl = itemGroup.get('receivedByControl') as FormControl;

    (itemGroup as any).originalItem = originalItem;

    if (this.action === 'Update' && !forceAddMode) {
      if (originalItem?.serviceInvoiceNo) serviceInvoiceNoControl.disable();
      if (originalItem?.productStatusId) productStatusControl.disable();
      if (originalItem?.newSerialNo) newSerialNoControl.disable();
      if (originalItem?.isUpgraded) {
        upgradeProductControl.setValue(true, { emitEvent: false });
        upgradeProductControl.disable();
        upgradedProductControl.setValue(originalItem.upgradedProduct, { emitEvent: false });
        upgradedProductControl.disable();
      }
    }

    statusControl.valueChanges.pipe(startWith(statusControl.value), takeUntil(this.destroy$)).subscribe(currentStatus => {
      const statusName = currentStatus?.statusName?.toLowerCase() || '';
      const isReady = statusName === 'ready';
      const isCompleted = statusName === 'completed';
      const isPending = statusName === 'pending';
      const isInProgress = statusName === 'in progress';
      const hasProductStatus = !!originalItem?.productStatusId;

      if ((isReady || isCompleted) && !hasProductStatus) {
        productStatusControl.enable();
        productStatusControl.setValidators(Validators.required);
      } else {
        productStatusControl.disable();
        productStatusControl.clearValidators();
      }

      const hasServiceInvoiceNo = !!originalItem?.serviceInvoiceNo;
      if (isPending) {
        serviceInvoiceNoControl.disable();
        serviceInvoiceNoControl.clearValidators();
        serviceInvoiceNoControl.setValue('');
      } else if (!hasServiceInvoiceNo) {
        serviceInvoiceNoControl.enable();
        serviceInvoiceNoControl.setValidators(Validators.required);
      } else {
        serviceInvoiceNoControl.disable();
      }

      if (this.action === 'Update' && !forceAddMode) {
        if (isInProgress || isReady || isCompleted) {
          givenByControl.enable();
          givenByControl.clearValidators(); 
        } else {
          givenByControl.disable();
          givenByControl.clearValidators();
          if (isPending) givenByControl.setValue(null);
        }

        if (isReady || isCompleted) {
          receivedByControl.enable();
          receivedByControl.clearValidators(); 
        } else {
          receivedByControl.disable();
          receivedByControl.clearValidators();
          if (isPending || isInProgress) receivedByControl.setValue(null);
        }
        givenByControl.updateValueAndValidity();
        receivedByControl.updateValueAndValidity();
      }

      productStatusControl.updateValueAndValidity();
      serviceInvoiceNoControl.updateValueAndValidity();
    });

    productStatusControl.valueChanges.pipe(startWith(productStatusControl.value), takeUntil(this.destroy$)).subscribe(currentProductStatus => {
      const isReplace = currentProductStatus?.statusName?.toLowerCase() === 'replace';
      const hasNewSerial = !!originalItem?.newSerialNo;

      if (isReplace) {
        if (!hasNewSerial) {
          newSerialNoControl.enable();
          newSerialNoControl.setValidators(Validators.required);
        } else {
          newSerialNoControl.disable();
        }
        if (!originalItem?.isUpgraded) upgradeProductControl.enable();
      } else {
        newSerialNoControl.disable();
        newSerialNoControl.clearValidators();
        newSerialNoControl.setValue('');
        if (!originalItem?.isUpgraded) {
          upgradeProductControl.disable();
          upgradeProductControl.setValue(false);
        }
      }
      newSerialNoControl.updateValueAndValidity();
      upgradeProductControl.updateValueAndValidity();
    });

    upgradeProductControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(isChecked => {
      if (isChecked && !originalItem?.isUpgraded) {
        upgradedProductControl.enable();
        upgradedProductControl.setValidators(Validators.required);
        this.setupUpgradedProductAutocomplete(itemGroup);
      } else if (!originalItem?.isUpgraded) {
        upgradedProductControl.disable();
        upgradedProductControl.clearValidators();
        upgradedProductControl.setValue('');
      }
      upgradedProductControl.updateValueAndValidity();
    });
  }

  setupUpgradedProductAutocomplete(itemGroup: ReplacedItemFormGroup): void {
    const control = itemGroup.get('upgradedProductControl') as FormControl;
    
    // 1. Setup the filter to show the Add New option
    itemGroup.filteredProducts = control.valueChanges.pipe(
      startWith(control.value || ''),
      debounceTime(300),
      map(value => {
        if (typeof value === 'string' && value.length === 0) return [];
        if (value === '*') return this.allProducts;
        
        const filtered = this._filterProducts(value || '', this.allProducts);
        
        if (typeof value === 'string' && value.trim().length > 0) {
          const exactMatch = this.allProducts.some(p => p.name.toLowerCase() === value.toLowerCase().trim());
          if (!exactMatch) {
            filtered.push({ id: -1, name: `Add Product '${value}'`, isActive: true } as Product);
          }
        }
        return filtered;
      })
    );

    // 2. Listen for the user clicking the "-1" option to open the dialog
    control.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      if (typeof value === 'object' && value?.id === -1) {
        const newName = value.name.match(/'(.*?)'/)?.[1] || '';
        // Pass 'upgradedProductControl' so the dialog knows which field to update!
        this.openNewProductDialog(newName, itemGroup, 'upgradedProductControl');
        control.setValue('', { emitEvent: false });
      }
    });
  }

  openNewProductDialog(prefilledName: string, itemGroup: ReplacedItemFormGroup, controlName: string = 'productControl'): void {
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '600px',
      data: { action: 'Add', product: { name: prefilledName } },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result?.event === 'Add' && result.data) {
        this.productsService.createProduct(result.data).subscribe(res => {
          if (res.success && res.data) {
            this.allProducts.push(res.data);
            // Use the dynamic controlName here
            itemGroup.get(controlName)?.setValue(res.data); 
            this.snackBar.open('New product added!', 'Dismiss', { duration: 2000 });
          }
        });
      } else {
        // Use the dynamic controlName here as well
        itemGroup.get(controlName)?.setValue('', { emitEvent: false });
      }
    });
  }

  openNewServiceCenterDialog(prefilledName: string, itemGroup: ReplacedItemFormGroup): void {
    const dialogRef = this.dialog.open(ServiceCenterDialogComponent, {
      width: '600px',
      data: { action: 'Add', serviceCenter: { name: prefilledName } },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result?.event === 'Add' && result.data) {
        this.serviceCentersService.createServiceCenter(result.data).subscribe(res => {
          if (res.success && res.data) {
            this.allServiceCenters.push(res.data);
            itemGroup.get('serviceCenterSearchControl')?.setValue(res.data);
            this.snackBar.open('New service center added!', 'Dismiss', { duration: 2000 });
          }
        });
      } else {
        itemGroup.get('serviceCenterSearchControl')?.setValue('', { emitEvent: false });
      }
    });
  }

  _getCombinedProducts(contactId: number): Product[] {
    const combined = new Map<number, Product>();
    this.allProducts.forEach(p => combined.set(p.id, { ...p }));
    this.allInvoiceProductsForContact.filter(ip => ip.contactId === contactId).forEach(ip => {
      if (!combined.has(ip.productId)) {
        combined.set(ip.productId, { id: ip.productId, name: `(R) ${ip.productName}`, isActive: true });
      } else {
        const p = combined.get(ip.productId)!;
        if (!p.name.startsWith('(R) ')) p.name = `(R) ${p.name}`;
      }
    });
    return Array.from(combined.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  _filterProducts(val: any, list: Product[]): Product[] {
    const filterVal = typeof val === 'string' ? val.toLowerCase() : val.name.toLowerCase();
    return list.filter(p => p.name.toLowerCase().includes(filterVal));
  }

  _filterContacts(val: any): Contact[] {
    const filterVal = typeof val === 'string' ? val.toLowerCase() : val.name.toLowerCase();
    return this.allContacts.filter(c => c.name.toLowerCase().includes(filterVal));
  }

  _filterServiceCenters(val: any): ServiceCenter[] {
    const filterVal = typeof val === 'string' ? val.toLowerCase() : val.name?.toLowerCase();
    return this.allServiceCenters.filter(s => s.name?.toLowerCase().includes(filterVal));
  }

  _filterSerialNumbers(val: any, list: InvoiceProduct[]): InvoiceProduct[] {
    const filterVal = typeof val === 'string' ? val.toLowerCase() : val.serialNo.toLowerCase();
    return list.filter(ip => ip.serialNo.toLowerCase().includes(filterVal));
  }

  formatWarranty(d?: number | null, u?: string | null): string {
    if (typeof d === 'number' && d > 0 && u) {
      return `${d} ${u}`;
    }
    return '';
  }

  calculateWarrantyEndDate(d: Date, dur: number, unit: string): Date | null {
    if (!d || !dur || !unit) return null;
    const end = new Date(d);
    if (unit === 'Days') end.setDate(end.getDate() + dur);
    else if (unit === 'Months') end.setMonth(end.getMonth() + dur);
    else if (unit === 'Years') end.setFullYear(end.getFullYear() + dur);
    return end;
  }

  checkWarrantyStatus(end: Date | null): boolean {
    if (!end) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(end) >= today;
  }

  loadInvoiceProductsForContact(contactId: number): Observable<InvoiceProduct[]> {
    return this.invoiceProductService.getContactProductSerialInvoice(undefined, contactId).pipe(
      map(res => res.data || []),
      catchError(err => {
        console.error('Error fetching invoice products', err);
        this.snackBar.open('Failed to fetch invoice products', 'Dismiss');
        return of([]);
      })
    );
  }

  closeDialog(): void {
    this.dialogRef.close({ event: 'Cancel' });
  }

  _mapReplacedItemToDto(item: any, isUpdateMode: boolean): ReplacementProductCreateDto {
    const isManualEntry = typeof item.serialNoControl === 'string';
    const hasManualWarranty = isManualEntry || !(item.serialNoControl as InvoiceProduct)?.warrantyDuration;
    
    const itemStatus = isUpdateMode ? item.statusControl : this.pendingStatus; 
    const isNewSerialRequired = isUpdateMode && itemStatus?.statusName?.toLowerCase() === 'replace';

    // --- SMART RESOLUTION: Product ---
    const productVal = item.productControl;
    let selectedProductId = null;
    let manualProductName = null;
    let productHadDefaultWarranty = false;
    if (productVal && typeof productVal === 'object') {
      selectedProductId = productVal.id;
      manualProductName = productVal.name;
      productHadDefaultWarranty = !!productVal.defaultWarrantyDuration;
    } else if (typeof productVal === 'string' && productVal.trim() !== '') {
      const found = this.allProducts.find(p => p.name.toLowerCase() === productVal.toLowerCase().trim());
      selectedProductId = found ? found.id : null;
      manualProductName = found ? found.name : productVal;
      productHadDefaultWarranty = found ? !!found.defaultWarrantyDuration : false;
    }

    // --- SMART RESOLUTION: Upgraded Product ---
    const upgradedVal = item.upgradedProductControl;
    let upgradedProductId = null;
    let upgradedProductName = null;
    if (item.upgradeProductControl) {
      if (upgradedVal && typeof upgradedVal === 'object') {
        upgradedProductId = upgradedVal.id;
        upgradedProductName = upgradedVal.name;
      } else if (typeof upgradedVal === 'string' && upgradedVal.trim() !== '') {
        const found = this.allProducts.find(p => p.name.toLowerCase() === upgradedVal.toLowerCase().trim());
        upgradedProductId = found ? found.id : null;
        upgradedProductName = found ? found.name : upgradedVal;
      }
    }

    // --- SMART RESOLUTION: Service Center ---
    const scVal = item.serviceCenterSearchControl;
    let serviceCenterId = null;
    let serviceCenterName = null;
    if (scVal && typeof scVal === 'object') {
      serviceCenterId = scVal.id;
      serviceCenterName = scVal.name;
    } else if (typeof scVal === 'string' && scVal.trim() !== '') {
      const found = this.allServiceCenters.find(sc => sc.name?.toLowerCase() === scVal.toLowerCase().trim());
      serviceCenterId = found ? found.id : null;
      serviceCenterName = found ? found.name : scVal;
    }

    const serialNumber = isManualEntry ? item.serialNoControl : (item.serialNoControl as InvoiceProduct)?.serialNo;
    const statusId = (itemStatus as Status)?.id;
    const shouldUpdateProductDefault = hasManualWarranty && selectedProductId !== null && !productHadDefaultWarranty;

    return {
      serviceCenterId: serviceCenterId,
      serviceCenterName: serviceCenterName,
      newSerialNo: isNewSerialRequired ? item.newSerialNoControl : null,
      statusId: statusId !== undefined ? statusId : null,
      isManualEntry: isManualEntry,
      serialNoValue: serialNumber || '',
      selectedProductId: selectedProductId, 
      manualProductName: manualProductName, 
      existingInvoiceProductId: (item.serialNoControl as InvoiceProduct)?.id,
      manualInvoiceNo: isManualEntry ? item.invoiceNoControl : undefined,
      manualInvoiceDate: isManualEntry ? this.datePipe.transform(item.invoiceDateControl, 'yyyy-MM-dd') || undefined : undefined,
      manualWarrantyDuration: hasManualWarranty ? item.manualWarrantyDurationControl : undefined,
      manualWarrantyUnit: hasManualWarranty ? item.manualWarrantyUnitControl : undefined,
      updateProductDefaultWarranty: shouldUpdateProductDefault,
      oldSerialNo: serialNumber,
      warrantyEndDate: this.datePipe.transform(item.calculatedWarrantyEndDateControl, 'yyyy-MM-dd') || undefined,
      isUnderWarranty: undefined,
      managedBy: undefined,
      replacedFromReplacementProductId: null,
      isUpgraded: item.upgradeProductControl,
      upgradedProductId: upgradedProductId,
      upgradedProductName: upgradedProductName
    };
  }

  doAction(): void {
    if (this.action === 'Delete') {
      if (!this.currentUserId) {
        this.snackBar.open('Error: User session invalid. Please re-login.', 'Dismiss', { duration: 3000, panelClass: ['error-snackbar'] });
        return;
      }
      this.replacementProductService.deleteReplacementByInvertNo(this.local_data as string, this.currentUserId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res.success) {
              this.snackBar.open('Moved to trash successfully!', 'Dismiss', { duration: 3000, panelClass: ['success-snackbar'] });
              
              this.dialogRef.close({ event: 'Delete', data: this.local_data });
            } else {
              this.snackBar.open('Failed: ' + res.message, 'Dismiss', { duration: 3000, panelClass: ['error-snackbar'] });
            }
          },
          error: (err) => {
            console.error(err);
            this.snackBar.open('Error occurred during deletion', 'Dismiss', { duration: 3000, panelClass: ['error-snackbar'] });
          }
        });
      return;
    }

    if (this.action === 'Restore') {
      // FIX: Ensure local_data is treated as the ID (number)
      const restoreId = Number(this.local_data);
      if (isNaN(restoreId)) {
         this.snackBar.open('Error: Invalid Item ID for restoration.', 'Dismiss', { duration: 3000, panelClass: ['error-snackbar'] });
         return;
      }

      this.replacementProductService.restoreReplacement(restoreId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res.success) {
              // Close dialog and pass 'Restore' event back to parent
              
              this.dialogRef.close({ event: 'Restore', data: this.local_data });
            } else {
              this.snackBar.open('Failed: ' + res.message, 'Dismiss', { duration: 3000, panelClass: ['error-snackbar'] });
            }
          },
          error: (err) => {
            this.snackBar.open('Error restoring record', 'Dismiss', { duration: 3000, panelClass: ['error-snackbar'] });
          }
        });
      return;
    }

    this.replacementForm.markAllAsTouched();
    const isNewItemsInvalid = this.action === 'Update' && this.newItems.invalid;

    if (this.replacementForm.invalid || isNewItemsInvalid) {
      this.snackBar.open('Please fill in all required fields.', 'Dismiss', { duration: 3000 });
      return;
    }

    const formValue = this.replacementForm.getRawValue();
    const isContactObject = typeof formValue.contactSearchControl === 'object' && formValue.contactSearchControl !== null;

    if (this.action === 'Add') {
      const requestDto: ReplacementRequestDto = {
        contact: {
          id: isContactObject ? formValue.contactSearchControl.id : null,
          name: isContactObject ? formValue.contactSearchControl.name : formValue.contactSearchControl,
          contactNo: this.contactNumberControl.value,
          whatsAppNumber: formValue.whatsAppNumberControl || null,
          emailId: isContactObject ? (formValue.contactSearchControl.emailId || null) : null,
          isActive: true
        },
        status: this.replacementForm.get('statusControl')?.value || this.pendingStatus,
        replacedItems: formValue.replacedItems.map((item: any) => this._mapReplacedItemToDto(item, false))
      };

      this.replacementProductService.addFullReplacement(requestDto).pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => {
          if (res.success) {
            this.snackBar.open('Replacement added!', 'Dismiss', { duration: 3000 });
            
            this.dialogRef.close({ event: 'Add', data: res.data });
          } else {
            this.snackBar.open('Failed: ' + res.message, 'Dismiss');
          }
        },
        error: (err) => this.snackBar.open('Error occurred', 'Dismiss')
      });

    } else if (this.action === 'Update') {
      const replacementUpdates: ReplacementProductUpdateDto[] = formValue.replacedItems.map((item: any) => {
        const isUpgraded = item.upgradeProductControl;
        
        // Smart Resolution for Update Mode
        const productVal = item.productControl;
        let productId = null;
        let manualProductName = null;
        if (productVal && typeof productVal === 'object') {
            productId = productVal.id;
            manualProductName = productVal.name;
        } else if (typeof productVal === 'string') {
            const found = this.allProducts.find(p => p.name.toLowerCase() === productVal.toLowerCase().trim());
            productId = found ? found.id : null;
            manualProductName = found ? found.name : productVal;
        }

        const serialVal = item.serialNoControl;
        const serialNo = (serialVal && typeof serialVal === 'object') ? serialVal.serialNo : serialVal;
        
        const scVal = item.serviceCenterSearchControl;
        let serviceCenterId = null;
        if (scVal && typeof scVal === 'object') {
            serviceCenterId = scVal.id;
        } else if (typeof scVal === 'string') {
            const foundSC = this.allServiceCenters.find(sc => sc.name?.toLowerCase() === scVal.toLowerCase().trim());
            serviceCenterId = foundSC ? foundSC.id : null;
        }

        return {
          id: item.id,
          statusId: item.statusControl?.id,
          productId: productId, 
          manualProductName: manualProductName,
          serialNo: serialNo,
          invoiceNo: item.invoiceNoControl,
          invoiceDate: item.invoiceDateControl ? this.datePipe.transform(item.invoiceDateControl, 'yyyy-MM-dd') : null,
          warrantyDuration: item.manualWarrantyDurationControl,
          warrantyUnit: item.manualWarrantyUnitControl,
          serviceCenterId: serviceCenterId,
          productStatusId: item.productStatusControl?.id || null,
          serviceInvoiceNo: item.serviceInvoiceNoControl || null,
          newSerialNo: item.newSerialNoControl || null,
          notes: item.notesControl || null,
          isUpgraded: isUpgraded,
          upgradedProductId: isUpgraded ? (typeof item.upgradedProductControl === 'object' ? item.upgradedProductControl?.id : null) : null,
          upgradedProductName: isUpgraded ? (typeof item.upgradedProductControl === 'object' ? item.upgradedProductControl?.name : item.upgradedProductControl) : null,
          givenByUserId: item.givenByControl || null,
          receivedByUserId: item.receivedByControl || null
        } as ReplacementProductUpdateDto;
      });

      const newProductsToAdd: ReplacementProductCreateDto[] = formValue.newlyAddedItems.map((item: any) => this._mapReplacedItemToDto(item, false));
      const contactVal = this.contactSearchControl.value;
      const contactId = (contactVal && typeof contactVal === 'object') ? contactVal.id : null;
      const contactNo = this.contactNumberControl.getRawValue();

      const updateRequestDto: ReplacementUpdateDto = {
        invertNo: this.invertNo,
        items: replacementUpdates,
        itemsToAdd: newProductsToAdd,
        whatsAppNumber: formValue.whatsAppNumberControl || null,
        contactId: contactId,
        contactNo: contactNo
      };

      this.replacementProductService.updateReplacement(updateRequestDto).pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => {
          if (res.success) {
            this.snackBar.open('Updated successfully!', 'Dismiss', { duration: 3000 });
            this.replacedItems.controls.forEach(g => {
              if (g.get('productStatusControl')?.value?.id) g.get('productStatusControl')?.disable();
              if (g.get('newSerialNoControl')?.value) g.get('newSerialNoControl')?.disable();
              if (g.get('serviceInvoiceNoControl')?.value) g.get('serviceInvoiceNoControl')?.disable();
            });
            
            this.dialogRef.close({ event: 'Update', data: res.data });
          } else {
            this.snackBar.open('Failed: ' + res.message, 'Dismiss');
          }
        },
        error: (err) => this.snackBar.open('Error during update', 'Dismiss')
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Add this method to your component class
  onDuplicateItemInAdd(index: number): void {
    // 1. Get the source form group
    const sourceGroup = this.replacedItems.at(index) as FormGroup;
    
    // 2. Collapse all existing items for better UX
    this.replacedItems.controls.forEach(c => (c as ReplacedItemFormGroup).isCollapsed = true);

    // 3. Get raw values to copy
    const raw = sourceGroup.getRawValue();

    // 4. Create a fresh group
    const newGroup = this.createReplacedItemFormGroup(undefined, true);

    // 5. Patch shared values (Product, Invoice, Dates, Warranty, Service Center)
    // We intentionally SKIP 'serialNoControl' so the user has to enter the new serial number
    newGroup.patchValue({
      productControl: raw.productControl,
      invoiceNoControl: raw.invoiceNoControl,
      invoiceDateControl: raw.invoiceDateControl,
      serviceCenterSearchControl: raw.serviceCenterSearchControl,
      manualWarrantyDurationControl: raw.manualWarrantyDurationControl,
      manualWarrantyUnitControl: raw.manualWarrantyUnitControl,
      warrantyDisplayControl: raw.warrantyDisplayControl
    });

    // 6. Force Manual Entry Mode (allows editing)
    (newGroup as ReplacedItemFormGroup).isManualEntry = true;
    newGroup.get('invoiceNoControl')?.enable();
    newGroup.get('invoiceDateControl')?.enable();
    newGroup.get('manualWarrantyDurationControl')?.enable();
    newGroup.get('manualWarrantyUnitControl')?.enable();

    // 7. Recalculate internals (warranty dates etc)
    this._triggerRecalculation(newGroup);

    // 8. Add to the list and expand it
    this.replacedItems.push(newGroup);
    (newGroup as ReplacedItemFormGroup).isCollapsed = false;

    this.snackBar.open('Item duplicated. Please enter the Serial Number.', 'Dismiss', { duration: 2500 });
  }

  onDuplicateNewItemInUpdate(index: number): void {
    const sourceGroup = this.newItems.at(index) as FormGroup;
    this._duplicateItemLogic(sourceGroup);
  }

  onDuplicateExistingItemInUpdate(index: number): void {
    const sourceGroup = this.replacedItems.at(index) as FormGroup;
    this._duplicateItemLogic(sourceGroup);
  }

  private _duplicateItemLogic(sourceGroup: FormGroup): void {
    // 1. Collapse all existing newly added items
    this.newItems.controls.forEach(c => (c as ReplacedItemFormGroup).isCollapsed = true);

    // 2. Get raw values to copy
    const raw = sourceGroup.getRawValue();

    // 3. Create a fresh group (forcing Add Mode)
    const newGroup = this.createReplacedItemFormGroup(undefined, true);

    // 4. Patch shared values (Product, Invoice, Dates, Warranty, Service Center)
    // We intentionally SKIP 'serialNoControl' and 'id' to make it a fresh item.
    newGroup.patchValue({
      productControl: raw.productControl,
      invoiceNoControl: raw.invoiceNoControl,
      invoiceDateControl: raw.invoiceDateControl,
      serviceCenterSearchControl: raw.serviceCenterSearchControl,
      manualWarrantyDurationControl: raw.manualWarrantyDurationControl,
      manualWarrantyUnitControl: raw.manualWarrantyUnitControl,
      // If the source had a calculated display, copy it for visual consistency
      warrantyDisplayControl: raw.warrantyDisplayControl
    });

    // 5. Force Manual Entry Mode 
    // (Because we are duplicating details, we treat it as manual/custom entry to allow edits)
    (newGroup as ReplacedItemFormGroup).isManualEntry = true;
    newGroup.get('invoiceNoControl')?.enable();
    newGroup.get('invoiceDateControl')?.enable();
    newGroup.get('manualWarrantyDurationControl')?.enable();
    newGroup.get('manualWarrantyUnitControl')?.enable();

    // 6. Recalculate internals (warranty dates etc) based on patched values
    this._triggerRecalculation(newGroup);

    // 7. Add to the list and expand it
    this.newItems.push(newGroup);
    (newGroup as ReplacedItemFormGroup).isCollapsed = false;

    this.snackBar.open('Item duplicated. Please enter the new Serial Number.', 'Dismiss', { duration: 2500 });
  }
  // --- NEW DUPLICATION LOGIC END ---
}