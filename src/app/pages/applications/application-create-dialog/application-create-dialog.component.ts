import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MaterialModule } from '../../../material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ApplicationService } from '../../../services/application.service';
import { ClientManagementService } from '../../../services/client-management.service';
import { TemplateService, ApplicationType } from '../../../services/template.service';
import { DocumentTypeService, DocumentType } from '../../../services/document-type.service';

@Component({
  selector: 'app-application-create-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MaterialModule,
    MatIconModule,
    TablerIconsModule
  ],
  templateUrl: './application-create-dialog.component.html',
  styleUrl: './application-create-dialog.component.scss'
})
export class ApplicationCreateDialogComponent implements OnInit {
  form: FormGroup;
  clients: any[] = [];
  filteredClients: any[] = [];
  templates: ApplicationType[] = [];
  documentTypes: DocumentType[] = [];
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ApplicationCreateDialogComponent>,
    private applicationService: ApplicationService,
    private clientService: ClientManagementService,
    private templateService: TemplateService,
    private documentTypeService: DocumentTypeService
  ) {
    this.form = this.fb.group({
      clientId: ['', Validators.required],
      applicationType: [''],
      title: ['', Validators.required],
      requirements: this.fb.array([this.createRequirementGroup()])
    });
  }

  ngOnInit(): void {
    // Load existing clients (fetch page 1, 100 items)
    this.clientService.listClients(1, 100).subscribe({
      next: (res: any) => {
        // The API returns a flat struct for connections. We need ClientID, FullName, ConnectionCode
        const records = res.data?.records || res.data || [];
        this.clients = records.map((conn: any) => ({
          id: conn.ClientID || conn.clientId || conn.client_id,
          fullName: conn.FullName || conn.fullName || 'Unknown Client',
          connectionCode: conn.ConnectionCode || conn.connectionCode || 'N/A'
        }));
        this.filteredClients = this.clients;
      },
      error: (err: any) => console.error('Failed to load clients', err)
    });

    // Load Document Types
    this.documentTypeService.getDocumentTypes().subscribe({
      next: (res) => {
        if (res.success || Array.isArray(res.data)) {
          this.documentTypes = res.data;
        }
      },
      error: (err) => console.error('Failed to load document types', err)
    });

    // Load templates
    this.templateService.getTemplates().subscribe({
      next: (res) => {
        if (res.success) {
          this.templates = res.data;
        }
      },
      error: (err) => console.error('Failed to load templates', err)
    });

    // Listen to applicationType changes
    this.form.get('applicationType')?.valueChanges.subscribe(templateId => {
      if (templateId) {
        const selectedTemplate = this.templates.find(t => t.id === templateId);
        if (selectedTemplate) {
          this.form.patchValue({ title: selectedTemplate.name });
          
          // Clear existing requirements
          while (this.requirements.length !== 0) {
            this.requirements.removeAt(0);
          }
          
          // Add requirements from template
          if (selectedTemplate.documents && selectedTemplate.documents.length > 0) {
            selectedTemplate.documents.forEach((doc: any) => {
              // Try to find the document_type_id by name, or fallback to the first one (for demo purposes)
              // Ideally the template documents themselves should have a document_type_id.
              const dt = this.documentTypes.find(d => (d.name || '').toLowerCase() === (doc.Name || doc.name || doc.document_name)?.toLowerCase());
              
              this.requirements.push(this.fb.group({
                documentTypeId: [dt ? dt.id : null, Validators.required],
                description: [doc.Description || doc.description || ''],
                displayOrder: [doc.DisplayOrder !== undefined ? doc.DisplayOrder : (doc.display_order || 0)],
                isRequired: [doc.IsRequired !== undefined ? doc.IsRequired : (doc.is_required !== undefined ? doc.is_required : true)]
              }));
            });
          }
        }
      }
    });
  }

  onSearchInput(event: any) {
    const term = event.target.value.toLowerCase();
    this.filteredClients = this.clients.filter(c => 
      c.fullName.toLowerCase().includes(term) || 
      (c.connectionCode && c.connectionCode.toLowerCase().includes(term))
    );
  }

  get requirements() {
    return this.form.get('requirements') as FormArray;
  }

  createRequirementGroup(): FormGroup {
    const order = this.form ? this.requirements.length : 0;
    return this.fb.group({
      documentTypeId: [null, Validators.required],
      description: [''],
      displayOrder: [order],
      isRequired: [true]
    });
  }

  addRequirement() {
    this.requirements.push(this.createRequirementGroup());
  }

  removeRequirement(index: number) {
    this.requirements.removeAt(index);
  }

  submit() {
    if (this.form.invalid) return;

    this.submitting = true;
    const val = this.form.value;

    const payload = {
      clientId: val.clientId,
      title: val.title,
      requirements: val.requirements.map((r: any, index: number) => ({
        document_type_id: parseInt(r.documentTypeId, 10),
        description: r.description,
        display_order: index + 1,
        is_required: r.isRequired
      }))
    };

    this.applicationService.createApplication(payload).subscribe({
      next: (res: any) => {
        this.submitting = false;
        this.dialogRef.close(res);
      },
      error: (err: any) => {
        console.error('Failed to create application', err);
        this.submitting = false;
      }
    });
  }
}
