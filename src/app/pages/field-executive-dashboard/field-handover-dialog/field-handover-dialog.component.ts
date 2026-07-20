import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TablerIconsModule } from 'angular-tabler-icons';

// Import Services & Models
import { ReplacementProductService, FieldExecutiveUpdateDto } from 'src/app/services/replacement-product.service';
import { AuthService } from 'src/app/services/auth.service';
import { FieldReadyDialogComponent } from '../field-ready-dialog/field-ready-dialog.component';

@Component({
  selector: 'app-field-handover-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, 
    MatInputModule, MatButtonModule, MatDatepickerModule, MatSelectModule,
    TablerIconsModule, MatSnackBarModule
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <div class="d-flex align-items-center justify-content-between p-b-16">
      <h2 mat-dialog-title class="m-0">Handover Item</h2>
      <span class="badge-sc text-primary bg-light-primary f-w-600 f-s-12 p-x-8 p-y-4 rounded">
        {{data.serviceCenterName}}
      </span>
    </div>
    
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="mat-typography custom-scrollbar">
        
        <div class="alert alert-light-primary mb-3 d-flex align-items-center">
          <i-tabler name="package" class="icon-20 m-r-8"></i-tabler>
          <div>
             <div class="f-s-12 text-muted">Current Handover</div>
             <strong class="f-s-14">{{data.invertNo}}</strong>
          </div>
        </div>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Status</mat-label>
          <mat-select formControlName="statusId" (selectionChange)="onStatusChange()">
            <mat-option [value]="2">In Progress (Accepted)</mat-option>
            <mat-option [value]="6">Not Accepted (Return Immediately)</mat-option>
          </mat-select>
        </mat-form-field>

        <div *ngIf="form.get('statusId')?.value === 2" class="fade-in">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Service Invoice No / Job ID</mat-label>
            <input matInput formControlName="serviceInvoiceNo" placeholder="e.g. JOB-8821">
            <mat-error *ngIf="form.get('serviceInvoiceNo')?.hasError('required')">Required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Tentative Return Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="tentativeDate" readonly>
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error *ngIf="form.get('tentativeDate')?.hasError('required')">Required</mat-error>
          </mat-form-field>
        </div>

        <div *ngIf="otherItems.length > 0" class="m-t-24 p-t-16 border-top">
          <div class="d-flex align-items-center mb-2">
             <i-tabler name="clipboard-list" class="icon-18 text-warning m-r-8"></i-tabler>
             <h4 class="f-s-14 m-0 f-w-600">Also at this Service Center:</h4>
          </div>
          
          <div class="other-items-list border rounded overflow-hidden">
             <div *ngFor="let item of otherItems" class="p-12 border-bottom d-flex justify-content-between align-items-center bg-white hover-bg">
                <div class="flex-grow-1 m-r-8">
                   <div class="f-w-600 f-s-13">{{item.invertNo}}</div>
                   <div class="f-s-11 text-muted text-truncate" style="max-width: 180px;">{{item.productName}}</div>
                </div>
                
                <button type="button" mat-stroked-button color="warn" class="scale-btn" 
                        (click)="onMarkOtherReady(item)" [disabled]="isProcessing">
                   <i-tabler name="check" class="icon-16 m-r-4"></i-tabler>
                   Ready
                </button>
             </div>
          </div>
          <div class="f-s-11 text-muted m-t-8">
             * Ask the Service Center if these are ready for pickup.
          </div>
        </div>

        <div *ngIf="otherItems.length === 0 && data.otherItems && data.otherItems.length > 0" class="m-t-16 text-center text-success fade-in">
            <small><i-tabler name="check" class="icon-14 v-middle"></i-tabler> All other items collected!</small>
        </div>

      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="p-24">
        <button mat-button type="button" (click)="dialogRef.close()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || isProcessing">
          Confirm Handover
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .alert-light-primary { background-color: #eef2ff; color: #4f46e5; border: 1px solid #e0e7ff; }
    .other-items-list { max-height: 200px; overflow-y: auto; background-color: #f8f9fa; }
    .other-items-list > div:last-child { border-bottom: none !important; }
    .hover-bg:hover { background-color: #f1f5f9; }
    .scale-btn { transform: scale(0.9); transform-origin: right; }
    .fade-in { animation: fadeIn 0.3s ease-in; }
    .custom-scrollbar { scrollbar-width: thin; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class FieldHandoverDialogComponent {
  form: FormGroup;
  otherItems: any[] = [];
  isProcessing = false;
  currentUserId: any;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<FieldHandoverDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      invertNo: string, 
      serviceCenterName: string, 
      otherItems: any[] 
    },
    // Inject Services to handle "Mark Ready" internally
    private dialog: MatDialog,
    private replacementService: ReplacementProductService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.otherItems = [...(data.otherItems || [])]; // Create a local copy
    this.currentUserId = this.authService.getUserId();

    this.form = this.fb.group({
      statusId: [2, Validators.required],
      serviceInvoiceNo: ['', Validators.required],
      tentativeDate: [new Date(), Validators.required]
    });
  }

  onStatusChange() {
    const statusId = this.form.get('statusId')?.value;
    const invoiceCtrl = this.form.get('serviceInvoiceNo');
    const dateCtrl = this.form.get('tentativeDate');

    if (statusId === 6) { 
      invoiceCtrl?.clearValidators();
      dateCtrl?.clearValidators();
      invoiceCtrl?.setValue('');
      dateCtrl?.setValue(null);
    } else {
      invoiceCtrl?.setValidators(Validators.required);
      dateCtrl?.setValidators(Validators.required);
    }
    
    invoiceCtrl?.updateValueAndValidity();
    dateCtrl?.updateValueAndValidity();
  }

  // ✅ NEW: Handle marking other items ready immediately
  onMarkOtherReady(item: any) {
    // 1. Open the Ready Dialog (Stacked on top)
    const ref = this.dialog.open(FieldReadyDialogComponent, {
      width: '1200px',
      data: { productName: item.productName, invertNo: item.invertNo },
      disableClose: true
    });

    ref.afterClosed().subscribe(res => {
      if (res) {
        this.processReadyUpdate(item, res);
      }
    });
  }

  // ✅ NEW: Call API to update status
  private processReadyUpdate(item: any, res: any) {
    this.isProcessing = true;
    
    const dto: FieldExecutiveUpdateDto = {
      id: item.id,
      invertNo: item.invertNo,
      actionType: 3, // Mark Ready
      userId: this.currentUserId,
      productStatusId: res.productStatusId,
      newSerialNo: res.newSerialNo,
      isUpgraded: res.isUpgraded,
      upgradedProductId: res.upgradedProductId,
      notes: res.notes
    };

    this.replacementService.updateFieldExecutiveStatus(dto).subscribe({
      next: (apiRes) => {
        this.isProcessing = false;
        if (apiRes.success) {
          this.snackBar.open(`${item.invertNo} marked as Ready!`, 'Close', { duration: 2000, panelClass: ['success-snackbar'] });
          
          // Remove from local list to show progress
          this.otherItems = this.otherItems.filter(i => i.invertNo !== item.invertNo);
        } else {
          this.snackBar.open(apiRes.message, 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        }
      },
      error: () => {
        this.isProcessing = false;
        this.snackBar.open('Update failed', 'Close', { panelClass: ['error-snackbar'] });
      }
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}