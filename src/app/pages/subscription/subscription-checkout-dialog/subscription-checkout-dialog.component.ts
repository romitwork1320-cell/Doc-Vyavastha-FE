import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ManualPaymentDto, Plan, SubscriptionService } from 'src/app/services/subscription.service';
import { TablerIconsModule } from 'angular-tabler-icons';

@Component({
  selector: 'app-subscription-checkout-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatInputModule, 
    MatSelectModule, 
    MatIconModule, 
    MatDividerModule,
    TablerIconsModule
  ],
  templateUrl: './subscription-checkout-dialog.component.html',
  styleUrls: ['./subscription-checkout-dialog.component.scss']
})
export class SubscriptionCheckoutDialogComponent {
  paymentMode: string = 'BankTransfer';
  referenceNumber: string = '';
  promoCode: string = '';
  promoApplied = false;
  
  discountAmount = 0;
  finalAmount: number;
  isLoading = false;
  isTrial = false; 
  isExtension = false;
  extensionDays = 0;

  constructor(
    public dialogRef: MatDialogRef<SubscriptionCheckoutDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { plan: Plan, tenantId: number, isExtension: boolean },
    private subService: SubscriptionService,
    private snackBar: MatSnackBar
  ) {
    this.finalAmount = data.plan.price;
    this.isTrial = data.plan.isTrial; 
    this.isExtension = data.isExtension || false;

    if (this.isTrial) {
        this.paymentMode = 'Trial';
        this.referenceNumber = 'TRIAL-ACTIVATION';
        this.finalAmount = 0;
    }
  }

  applyPromo() {
    if (!this.promoCode) return;

    this.isLoading = true;
    this.subService.validatePromo(this.promoCode, this.data.plan.price, this.data.tenantId)
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.success && res.data) {
            try {
              const resultData: any = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
              this.discountAmount = resultData.discount;
              this.extensionDays = resultData.extensionDays;
              
              if (!this.isTrial) {
                  this.finalAmount = resultData.finalAmount;
              }
              
              this.promoApplied = true;
              this.snackBar.open('Coupon Applied!', 'Close', { duration: 3000, panelClass: 'success-snack' });
            } catch (e) {
              this.snackBar.open('Error applying promo', 'Close', { duration: 3000 });
            }
          } else {
            this.snackBar.open(res.message, 'Close', { duration: 3000, panelClass: 'error-snack' });
          }
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Invalid Code', 'Close', { duration: 3000 });
        }
      });
  }

  submitPayment() {
    this.isLoading = true;

    if (this.isTrial) {
        // [CRITICAL CHECK] If this is an extension, BLOCK if no code applied
        if (this.isExtension && !this.promoApplied) {
            this.snackBar.open('Extension requires a valid Promo Code.', 'Close', { duration: 4000, panelClass: 'error-snack' });
            this.isLoading = false;
            return; // Stop here
        }

        // Proceed to call API
        this.subService.extendTrial(this.data.tenantId, this.data.plan.planId, this.promoCode)
            .subscribe({
                next: (res) => {
                    this.isLoading = false;
                    if (res.success) {
                        this.dialogRef.close(true);
                    } else {
                        this.snackBar.open(res.message, 'Close', { duration: 5000 });
                    }
                },
                error: (err) => {
                    this.isLoading = false;
                    this.snackBar.open(err.error?.message || 'Failed', 'Close', { duration: 5000 });
                }
            });
        return; 
    }

    if (!this.referenceNumber) return;

    const dto: ManualPaymentDto = {
      tenantId: this.data.tenantId,
      planId: this.data.plan.planId,
      promoCodeId: this.promoApplied ? 1 : undefined, 
      originalAmount: this.data.plan.price,
      discountAmount: this.discountAmount,
      finalAmount: this.finalAmount,
      paymentMode: this.paymentMode,
      referenceNumber: this.referenceNumber
    };

    this.subService.recordManualPayment(dto).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.dialogRef.close(true);
        } else {
          this.snackBar.open(res.message, 'Close', { duration: 5000 });
        }
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Payment Failed', 'Close', { duration: 5000 });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}