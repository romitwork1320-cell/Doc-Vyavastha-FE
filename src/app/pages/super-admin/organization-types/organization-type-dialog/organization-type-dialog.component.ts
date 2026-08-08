import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TablerIconsModule } from 'angular-tabler-icons';
import { OrganizationTypeService, OrganizationType } from '../../../../services/organization-type.service';

@Component({
  selector: 'app-organization-type-dialog',
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
  templateUrl: './organization-type-dialog.component.html',
  styleUrls: ['./organization-type-dialog.component.scss']
})
export class OrganizationTypeDialogComponent implements OnInit {
  form: FormGroup;
  isEditMode = false;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<OrganizationTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: OrganizationType | null,
    private orgTypeService: OrganizationTypeService
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
      this.orgTypeService.updateOrganizationType(this.data.id, reqData).subscribe({
        next: (res) => {
          this.submitting = false;
          this.dialogRef.close(res.data);
        },
        error: (err) => {
          console.error('Failed to update organization type', err);
          this.submitting = false;
        }
      });
    } else {
      this.orgTypeService.createOrganizationType(reqData).subscribe({
        next: (res) => {
          this.submitting = false;
          this.dialogRef.close(res.data);
        },
        error: (err) => {
          console.error('Failed to create organization type', err);
          this.submitting = false;
        }
      });
    }
  }
}
