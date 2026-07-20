import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TablerIconsModule } from 'angular-tabler-icons';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  subMessage?: string; // For the colored info box
  confirmButtonText: string;
  confirmButtonColor: 'primary' | 'warn' | 'accent';
  
  // Styling keys matches your CSS system (e.g. 'error', 'primary', 'warning')
  type: 'error' | 'primary' | 'warning'; 
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, TablerIconsModule],
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent {
  
  // Helper to map type to CSS classes
  get config() {
    switch (this.data.type) {
      case 'error':
        return {
          icon: 'trash',
          iconBg: 'bg-light-error',
          iconColor: 'text-error',
          infoBoxBg: 'bg-light-error',
          infoBoxText: 'text-error'
        };
      case 'warning':
        return {
          icon: 'alert-triangle',
          iconBg: 'bg-light-warning',
          iconColor: 'text-warning',
          infoBoxBg: 'bg-light-warning',
          infoBoxText: 'text-warning'
        };
      case 'primary':
      default:
        return {
          icon: 'info-circle',
          iconBg: 'bg-light-primary',
          iconColor: 'text-primary',
          infoBoxBg: 'bg-light-primary',
          infoBoxText: 'text-primary'
        };
    }
  }

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {}
}