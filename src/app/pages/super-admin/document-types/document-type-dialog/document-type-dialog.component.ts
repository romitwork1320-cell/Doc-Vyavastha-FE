import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TablerIconsModule } from 'angular-tabler-icons';
import { TemplateService, DocumentType } from '../../../../services/template.service';

@Component({
  selector: 'app-document-type-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    TablerIconsModule
  ],
  templateUrl: './document-type-dialog.component.html',
  styleUrls: ['./document-type-dialog.component.scss']
})
export class DocumentTypeDialogComponent implements OnInit {
  form: FormGroup;
  isEditMode = false;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DocumentTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DocumentType | null,
    private templateService: TemplateService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });

    if (data && data.id) {
      this.isEditMode = true;
      this.form.patchValue({
        name: data.name,
        description: data.description
      });
    }
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    const reqData = this.form.value;

    if (this.isEditMode && this.data?.id) {
      this.templateService.updateDocumentType(this.data.id, reqData).subscribe({
        next: (res) => {
          this.submitting = false;
          this.dialogRef.close(res.data);
        },
        error: (err) => {
          console.error('Failed to update document type', err);
          this.submitting = false;
        }
      });
    } else {
      this.templateService.createDocumentType(reqData).subscribe({
        next: (res) => {
          this.submitting = false;
          this.dialogRef.close(res.data);
        },
        error: (err) => {
          console.error('Failed to create document type', err);
          this.submitting = false;
        }
      });
    }
  }
}
