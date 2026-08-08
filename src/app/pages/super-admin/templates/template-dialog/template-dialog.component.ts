import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { TablerIconsModule } from 'angular-tabler-icons';

import { TemplateService, ApplicationType, DocumentType } from '../../../../services/template.service';

@Component({
  selector: 'app-template-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
    TablerIconsModule
  ],
  templateUrl: './template-dialog.component.html',
  styleUrls: ['./template-dialog.component.scss']
})
export class TemplateDialogComponent implements OnInit {
  form: FormGroup;
  isEditMode = false;
  submitting = false;
  masterDocumentTypes: DocumentType[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TemplateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ApplicationType | null,
    private templateService: TemplateService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      documents: this.fb.array([])
    });

    if (data && data.id) {
      this.isEditMode = true;
      this.form.patchValue({
        name: data.name,
        description: data.description
      });

      if (data.documents && data.documents.length > 0) {
        data.documents.forEach(doc => {
          this.documents.push(this.createDocumentGroup(
            doc.document_type_id,
            doc.is_required,
            doc.display_order
          ));
        });
      }
    } else {
      // Add one empty row by default
      this.addDocument();
    }
  }

  ngOnInit(): void {
    this.loadDocumentTypes();
  }

  loadDocumentTypes(): void {
    this.templateService.getDocumentTypes().subscribe({
      next: (res) => {
        if (res.success) {
          this.masterDocumentTypes = res.data;
        }
      },
      error: (err) => console.error('Failed to load document types', err)
    });
  }

  get documents() {
    return this.form.get('documents') as FormArray;
  }

  createDocumentGroup(documentTypeId: number | '' = '', isRequired: boolean = true, displayOrder: number = this.documents.length): FormGroup {
    return this.fb.group({
      document_type_id: [documentTypeId, Validators.required],
      display_order: [displayOrder],
      is_required: [isRequired]
    });
  }

  addDocument() {
    this.documents.push(this.createDocumentGroup());
  }

  removeDocument(index: number) {
    this.documents.removeAt(index);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    const reqData = this.form.value;

    if (this.isEditMode && this.data?.id) {
      this.templateService.updateTemplate(this.data.id, reqData).subscribe({
        next: (res) => {
          this.submitting = false;
          this.dialogRef.close(res.data);
        },
        error: (err) => {
          console.error('Failed to update template', err);
          this.submitting = false;
        }
      });
    } else {
      this.templateService.createTemplate(reqData).subscribe({
        next: (res) => {
          this.submitting = false;
          this.dialogRef.close(res.data);
        },
        error: (err) => {
          console.error('Failed to create template', err);
          this.submitting = false;
        }
      });
    }
  }
}
