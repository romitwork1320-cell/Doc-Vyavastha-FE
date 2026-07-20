import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { TablerIconsModule } from 'angular-tabler-icons';

@Component({
  selector: 'app-generate-promo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    TablerIconsModule
  ],
  templateUrl: './generate-promo-dialog.component.html',
  styleUrls: ['./generate-promo-dialog.component.scss']
})
export class GeneratePromoDialogComponent implements OnInit {
  promoForm: FormGroup;
  discountTypes = ['Day', 'Percentage', 'Fixed Amount'];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<GeneratePromoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    const today = new Date();
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);

    this.promoForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)],
      discountType: ['Day', Validators.required],
      
      // Default to 30 because 'Day' is the default type
      discountValue: [30, [Validators.required, Validators.min(0.01)]], 
      
      // Default Max Usage Limit to 1
      maxUsageLimit: [1, Validators.min(1)], 
      
      validFrom: [today], // Default to today
      
      // Default to 2 days from today
      validTo: [twoDaysFromNow] 
    });
  }

  ngOnInit(): void {
    // Dynamically update discountValue when the type changes
    this.promoForm.get('discountType')?.valueChanges.subscribe((type) => {
      if (type === 'Day') {
        this.promoForm.get('discountValue')?.setValue(30);
      } else {
        // Clear the value for Percentage or Fixed Amount to force user input
        this.promoForm.get('discountValue')?.setValue(null); 
      }
    });
  }

  // Helper getter for the HTML template
  get selectedType(): string {
    return this.promoForm.get('discountType')?.value;
  }

  autoGenerateCode(): void {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.promoForm.patchValue({ code: result });
  }

  onSubmit(): void {
    if (this.promoForm.valid) {
      const formValue = this.promoForm.value;
      
      const payload = {
        ...formValue,
        discountType: formValue.discountType === 'Fixed Amount' ? 'Fixed' : formValue.discountType,
        validFrom: formValue.validFrom ? new Date(formValue.validFrom).toISOString() : null,
        validTo: formValue.validTo ? new Date(formValue.validTo).toISOString() : null,
      };

      this.dialogRef.close(payload);
    } else {
      this.promoForm.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}