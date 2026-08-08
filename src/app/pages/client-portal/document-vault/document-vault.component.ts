import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { TablerIconsModule } from 'angular-tabler-icons';
import { DocumentVaultService, VaultFolder, VaultFile } from '../../../services/document-vault.service';
import { DocumentAccessDialogComponent } from '../document-access-dialog/document-access-dialog.component';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-document-vault',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatMenuModule,
    TablerIconsModule,
    DatePipe,
    MatPaginatorModule
  ],
  templateUrl: './document-vault.component.html',
  styleUrls: ['./document-vault.component.scss']
})
export class DocumentVaultComponent implements OnInit {
  folders: VaultFolder[] = [];
  selectedFolder: VaultFolder | null = null;
  files: VaultFile[] = [];
  paginatedFiles: VaultFile[] = [];
  loading = true;
  displayedColumns: string[] = ['name', 'uploadedAt', 'source', 'access', 'actions'];

  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;

  constructor(
    private vaultService: DocumentVaultService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadFolders();
  }

  loadFolders(): void {
    this.loading = true;
    this.selectedFolder = null;
    this.vaultService.getFolders().subscribe({
      next: (res) => {
        this.folders = res.data || [];
        this.loading = false;
      },
      error: (err) => {
        this.snackBar.open('Failed to load folders', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  openFolder(folder: VaultFolder): void {
    this.selectedFolder = folder;
    this.loadFiles(folder.document_type_id);
  }

  loadFiles(typeId: number): void {
    this.loading = true;
    this.vaultService.getFiles(typeId).subscribe({
      next: (res) => {
        this.files = res.data || [];
        this.currentPage = 1;
        this.updatePagination();
        this.loading = false;
      },
      error: (err) => {
        this.snackBar.open('Failed to load files', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.updatePagination();
  }

  updatePagination() {
    this.totalRecords = this.files.length;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedFiles = this.files.slice(startIndex, startIndex + this.pageSize);
  }

  backToFolders(): void {
    this.selectedFolder = null;
    this.files = [];
    this.loadFolders();
  }

  openAccessDialog(doc: VaultFile): void {
    const dialogRef = this.dialog.open(DocumentAccessDialogComponent, {
      width: '600px',
      data: { document: doc }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.selectedFolder) {
        this.loadFiles(this.selectedFolder.document_type_id);
      }
    });
  }

  viewDocument(element: VaultFile): void {
    this.vaultService.downloadFile(element.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      },
      error: (err) => {
        this.snackBar.open('Failed to load document', 'Close', { duration: 3000 });
      }
    });
  }

  deleteDocument(doc: VaultFile): void {
    if (confirm('Are you sure you want to delete this document from your vault?')) {
      this.vaultService.deleteFile(doc.id).subscribe({
        next: () => {
          this.snackBar.open('Document deleted', 'Close', { duration: 3000 });
          if (this.selectedFolder) {
            this.loadFiles(this.selectedFolder.document_type_id);
          }
        },
        error: (err) => {
          this.snackBar.open('Failed to delete document', 'Close', { duration: 3000 });
        }
      });
    }
  }

  renameDocument(doc: VaultFile): void {
    const newName = prompt('Enter new document name:', doc.file_name);
    if (newName && newName.trim() !== '' && newName !== doc.file_name) {
      this.vaultService.renameFile(doc.id, newName).subscribe({
        next: () => {
          this.snackBar.open('Document renamed', 'Close', { duration: 3000 });
          if (this.selectedFolder) {
            this.loadFiles(this.selectedFolder.document_type_id);
          }
        },
        error: (err) => {
          this.snackBar.open('Failed to rename document', 'Close', { duration: 3000 });
        }
      });
    }
  }

  uploadDocument(event: any): void {
    const file = event.target.files[0];
    if (file && this.selectedFolder) {
      // Use original filename without asking the user
      const fileName = file.name;

      this.loading = true;
      this.vaultService.uploadFile(this.selectedFolder.document_type_id, fileName, file).subscribe({
        next: () => {
          this.snackBar.open('Document uploaded successfully', 'Close', { duration: 3000 });
          this.loadFiles(this.selectedFolder!.document_type_id);
        },
        error: (err) => {
          this.snackBar.open('Failed to upload document', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
    }
  }
}
