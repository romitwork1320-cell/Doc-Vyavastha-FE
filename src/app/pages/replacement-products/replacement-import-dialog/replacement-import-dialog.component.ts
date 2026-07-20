import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ReplacementProductService } from 'src/app/services/replacement-product.service'; // Correct Service
import { finalize } from 'rxjs';
import * as saveAs from 'file-saver';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-replacement-import-dialog',
  standalone: true,
  imports: [ CommonModule, MatDialogModule, MatButtonModule, MatProgressSpinnerModule, TablerIconsModule, MatTooltipModule ],
  templateUrl: './replacement-import-dialog.component.html',
  styleUrls: ['./replacement-import-dialog.component.scss'] 
})
export class ReplacementImportDialogComponent {
  selectedFile: File | null = null;
  isProcessing: boolean = false;
  isDragging: boolean = false;
  @ViewChild('fileInput') fileInput: any;

  constructor(
    public dialogRef: MatDialogRef<ReplacementImportDialogComponent>,
    private replacementProductService: ReplacementProductService, // Correct Service
    private snackBar: MatSnackBar
  ) {}
  
  onDragOver(event: DragEvent): void { event.preventDefault(); event.stopPropagation(); this.isDragging = true; }
  onDragLeave(event: DragEvent): void { event.preventDefault(); event.stopPropagation(); this.isDragging = false; }
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (event.dataTransfer?.files[0]) this.handleFile(event.dataTransfer.files[0]);
  }

  downloadTemplate(): void {
    this.isProcessing = true;
    this.replacementProductService.getImportTemplate() // Correct Method
      .pipe(finalize(() => this.isProcessing = false))
      .subscribe(blob => saveAs(blob, 'Replacement_Import_Template.xlsx'));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) this.handleFile(input.files[0]);
  }

  handleFile(file: File): void {
    const allowedTypes = [ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel' ];
    if (!allowedTypes.includes(file.type)) {
      this.snackBar.open('Invalid file type. Please upload an Excel file.', 'Close', { duration: 5000 });
      this.clearSelection();
      return;
    }
    this.selectedFile = file;
  }

  clearSelection(event?: MouseEvent): void {
    if (event) { event.stopPropagation(); }
    this.selectedFile = null;
    this.fileInput.nativeElement.value = '';
  }

  onUpload(): void {
    if (!this.selectedFile) return;
    this.isProcessing = true;
    this.replacementProductService.importReplacements(this.selectedFile) // Correct Method
      .pipe(finalize(() => this.isProcessing = false))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open(response.message, 'Close', { duration: 5000 });
            this.dialogRef.close({ success: true });
          } else {
            this.snackBar.open(`Import failed: ${response.message}`, 'Close', { duration: 7000 });
          }
        },
        error: (err) => {
          const apiResponse = err.error;
          if (apiResponse && apiResponse.message && apiResponse.message.includes('UNIQUE KEY constraint')) {
            this.snackBar.open('Import failed: One or more records in the file already exist.', 'Close', { duration: 7000 });
          } else {
            this.snackBar.open('An unexpected error occurred during import.', 'Close', { duration: 5000 });
          }
        }
      });
  }
  
  closeDialog(): void {
    this.dialogRef.close();
  }
}