import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SystemLog } from 'src/app/services/system-log.service';

@Component({
  selector: 'app-system-log-details-dialog',
  templateUrl: './system-log-details-dialog.component.html',
  styleUrls: ['./system-log-details-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatIconModule, 
    TablerIconsModule,
    MatTooltipModule
  ],
})
export class SystemLogDetailsDialogComponent {
  
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: SystemLog,
    private snackBar: MatSnackBar
  ) {}

  copyStackTrace(): void {
    if (!this.data.stackTrace) return;

    navigator.clipboard.writeText(this.data.stackTrace).then(() => {
      this.snackBar.open('Stack trace copied to clipboard!', 'Close', { 
        duration: 2000,
        panelClass: ['success-snackbar'] // Ensure you have this class or remove it
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      this.snackBar.open('Failed to copy', 'Close', { duration: 2000 });
    });
  }
}