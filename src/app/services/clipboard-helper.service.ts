import { Injectable } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ClipboardHelperService {

  constructor(
    private clipboard: Clipboard, 
    private snackBar: MatSnackBar
  ) {}

  /**
   * Copies text to clipboard and shows a snackbar confirmation.
   * @param text The text to copy.
   * @param successMessage Optional custom message (default: 'Copied to clipboard!')
   */
  copy(text: any, successMessage: string = 'Copied to clipboard!'): void {
    if (!text || text === '—' || text === '-') return;
    
    // Ensure we are copying a string
    const textToCopy = String(text);

    const successful = this.clipboard.copy(textToCopy);

    if (successful) {
      this.snackBar.open(successMessage, 'Dismiss', { 
        duration: 2000,
        panelClass: ['success-snackbar'] // Ensure you have this class or remove it
      });
    } else {
      this.snackBar.open('Failed to copy', 'Dismiss', { duration: 2000 });
    }
  }
}