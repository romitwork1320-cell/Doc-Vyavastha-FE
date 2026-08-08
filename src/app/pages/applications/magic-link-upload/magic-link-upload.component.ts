import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ApplicationService } from '../../../services/application.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { VaultFolder, VaultFile } from '../../../services/document-vault.service';

@Component({
  selector: 'app-magic-link-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TablerIconsModule,
    DatePipe
  ],
  templateUrl: './magic-link-upload.component.html',
  styleUrl: './magic-link-upload.component.scss'
})
export class MagicLinkUploadComponent implements OnInit {
  token: string | null = null;
  magicLinkData: any = null;
  loading = true;
  error: string | null = null;
  isSubmitting = false;

  stagedFiles: { [reqId: number]: File[] } = {};
  stagedVaultFiles: { [reqId: number]: VaultFile[] } = {};

  // Vault Selection State
  isVaultViewOpen = false;
  vaultLoading = false;
  vaultFolders: VaultFolder[] = [];
  vaultFiles: VaultFile[] = [];
  selectedVaultFolder: VaultFolder | null = null;
  activeReqIdForVault: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private applicationService: ApplicationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token');
    if (this.token) {
      this.loadData();
    } else {
      this.error = 'Invalid Link';
      this.loading = false;
    }
  }

  loadData() {
    this.applicationService.getMagicLinkDetails(this.token!).subscribe({
      next: (res) => {
        this.magicLinkData = res.data;
        this.loading = false;
        
        // Initialize staged files map
        if (this.magicLinkData && this.magicLinkData.requirements) {
          this.magicLinkData.requirements.forEach((req: any) => {
            if (!this.stagedFiles[req.id]) {
              this.stagedFiles[req.id] = [];
            }
          });
        }
      },
      error: (err) => {
        console.error(err);
        this.error = 'This link is invalid or has expired.';
        this.loading = false;
      }
    });
  }

  onFileSelected(event: any, reqId: number) {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      if (!this.stagedFiles[reqId]) {
        this.stagedFiles[reqId] = [];
      }
      for (let i = 0; i < files.length; i++) {
        this.stagedFiles[reqId].push(files[i]);
      }
    }
    // clear input so same file can be selected again if needed
    event.target.value = '';
  }

  // --- Vault Selection Methods ---

  openVaultSelection(reqId: number): void {
    if (!this.token) return;
    this.activeReqIdForVault = reqId;
    this.isVaultViewOpen = true;
    this.selectedVaultFolder = null;
    this.vaultLoading = true;

    this.applicationService.getMagicLinkVaultFolders(this.token).subscribe({
      next: (res) => {
        this.vaultFolders = res.data || [];
        this.vaultLoading = false;
      },
      error: (err) => {
        this.snackBar.open('Failed to load vault folders', 'Close', { duration: 3000 });
        this.vaultLoading = false;
        this.isVaultViewOpen = false;
      }
    });
  }

  openVaultFolder(folder: VaultFolder): void {
    if (!this.token) return;
    this.selectedVaultFolder = folder;
    this.vaultLoading = true;

    this.applicationService.getMagicLinkVaultFiles(this.token, folder.document_type_id).subscribe({
      next: (res) => {
        this.vaultFiles = res.data || [];
        this.vaultLoading = false;
      },
      error: (err) => {
        this.snackBar.open('Failed to load vault files', 'Close', { duration: 3000 });
        this.vaultLoading = false;
      }
    });
  }

  backToVaultFolders(): void {
    this.selectedVaultFolder = null;
    this.vaultFiles = [];
  }

  closeVaultSelection(): void {
    this.isVaultViewOpen = false;
    this.activeReqIdForVault = null;
    this.selectedVaultFolder = null;
  }

  selectVaultFile(file: VaultFile): void {
    if (this.activeReqIdForVault) {
      // Clear manual staged files if they select from vault
      this.stagedFiles[this.activeReqIdForVault] = [];
      
      if (!this.stagedVaultFiles[this.activeReqIdForVault]) {
        this.stagedVaultFiles[this.activeReqIdForVault] = [];
      }
      
      const index = this.stagedVaultFiles[this.activeReqIdForVault].findIndex(f => f.id === file.id);
      if (index === -1) {
        this.stagedVaultFiles[this.activeReqIdForVault].push(file);
      } else {
        this.stagedVaultFiles[this.activeReqIdForVault].splice(index, 1);
      }
    }
  }

  isVaultFileSelected(file: VaultFile): boolean {
    if (!this.activeReqIdForVault || !this.stagedVaultFiles[this.activeReqIdForVault]) return false;
    return this.stagedVaultFiles[this.activeReqIdForVault].some(f => f.id === file.id);
  }

  removeStagedVaultFile(reqId: number, index: number): void {
    if (this.stagedVaultFiles[reqId]) {
      this.stagedVaultFiles[reqId].splice(index, 1);
    }
  }

  removeStagedFile(reqId: number, index: number) {
    if (this.stagedFiles[reqId]) {
      this.stagedFiles[reqId].splice(index, 1);
    }
  }

  hasStagedFiles(): boolean {
    for (const reqId in this.stagedVaultFiles) {
      if (this.stagedVaultFiles[reqId].length > 0) return true;
    }
    for (const reqId in this.stagedFiles) {
      if (this.stagedFiles[reqId].length > 0) return true;
    }
    return false;
  }

  submitAll() {
    if (!this.token) return;
    
    this.isSubmitting = true;
    const uploadObservables: Observable<any>[] = [];

    for (const reqIdStr in this.stagedFiles) {
      const reqId = parseInt(reqIdStr, 10);
      const files = this.stagedFiles[reqId];
      if (files && files.length > 0) {
        const uploadReq = this.applicationService.uploadDocument(this.token, reqId, files).pipe(
          catchError(err => {
            console.error(`Failed to upload for reqId ${reqId}`, err);
            return of({ error: true, reqId }); // Catch error so forkJoin doesn't immediately fail
          })
        );
        uploadObservables.push(uploadReq);
      }
    }

    for (const reqIdStr in this.stagedVaultFiles) {
      const reqId = parseInt(reqIdStr, 10);
      const vaultFiles = this.stagedVaultFiles[reqId];
      if (vaultFiles && vaultFiles.length > 0) {
        const ids = vaultFiles.map(f => f.id);
        const uploadReq = this.applicationService.uploadFromVault(this.token, reqId, ids).pipe(
          catchError(err => {
            console.error(`Failed to attach from vault for reqId ${reqId}`, err);
            return of({ error: true, reqId });
          })
        );
        uploadObservables.push(uploadReq);
      }
    }

    if (uploadObservables.length === 0) {
      this.isSubmitting = false;
      return;
    }

    forkJoin(uploadObservables).subscribe({
      next: (results) => {
        const hasErrors = results.some(res => res && res.error);
        if (hasErrors) {
          this.snackBar.open('Some documents failed to upload. Please try again.', 'Close', { duration: 5000 });
        } else {
          this.snackBar.open('All documents submitted successfully!', 'Close', { duration: 3000 });
        }
        
        this.stagedFiles = {}; // Clear staged files
        this.stagedVaultFiles = {}; // Clear staged vault files
        this.isSubmitting = false;
        this.loadData(); // Reload to get updated status and versions
      },
      error: (err) => {
        console.error('Submit all error', err);
        this.isSubmitting = false;
        this.snackBar.open('An unexpected error occurred during submission.', 'Close', { duration: 5000 });
      }
    });
  }
}
