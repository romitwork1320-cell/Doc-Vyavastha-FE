import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { ManualPaymentDto } from 'src/app/services/subscription.service';

@Component({
  selector: 'app-subscription-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatListModule, MatDividerModule],
  template: `
    <h2 mat-dialog-title class="f-w-600">Confirm Payment Details</h2>
    <mat-dialog-content>
      <div class="alert alert-light-primary text-primary m-b-16 p-16 rounded" style="background: #ecf2ff; color: #5d87ff;">
        Please verify the transaction details below. Once confirmed, the subscription will be activated immediately.
      </div>

      <div class="d-flex justify-content-between m-b-12">
        <span class="text-muted">Plan Name</span>
        <span class="f-w-600">{{ data.planName }}</span>
      </div>

      <div class="d-flex justify-content-between m-b-12">
        <span class="text-muted">Payment Mode</span>
        <span class="f-w-600">{{ data.paymentDto.paymentMode }}</span>
      </div>

      <div class="d-flex justify-content-between m-b-12">
        <span class="text-muted">Reference / UTR</span>
        <span class="f-w-600">{{ data.paymentDto.referenceNumber }}</span>
      </div>

      <mat-divider class="m-y-16"></mat-divider>

      <div class="d-flex justify-content-between align-items-center">
        <span class="f-s-16">Total Amount</span>
        <span class="f-s-20 f-w-700 text-primary">₹{{ data.paymentDto.finalAmount | number }}</span>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end" class="p-24">
      <button mat-stroked-button color="warn" (click)="onCancel()">Cancel</button>
      <button mat-flat-button color="primary" (click)="onConfirm()" cdkFocusInitial>
        Confirm & Activate
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .text-muted { color: #6c757d; }
    .f-w-600 { font-weight: 600; }
    .f-w-700 { font-weight: 700; }
    .f-s-20 { font-size: 20px; }
  `]
})
export class SubscriptionConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SubscriptionConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { paymentDto: ManualPaymentDto, planName: string }
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}