import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StudentApplicationService } from '../../../services/student-application.service';
import { StudentService } from '../../../services/student.service';
import { ApplicationTypeService } from '../../../services/application-type.service';
import { ApplicationStatusService } from '../../../services/application-status.service';
import { FormTypeService } from '../../../services/form-type.service';
import { CollegeService } from '../../../services/college.service';
import { ApplicationFeeCollectionService } from '../../../services/application-fee-collection.service';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

@Component({
  selector: 'app-application-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TablerIconsModule, MatSelectModule, MatOptionModule],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 class="dialog-title">{{ isEdit ? 'Edit Application' : 'Create Application' }}</h2>
        <button class="close-btn" (click)="close()">
          <i-tabler name="x" style="width:20px;height:20px"></i-tabler>
        </button>
      </div>

      <div class="dialog-content">
        <form [formGroup]="form" class="crm-form">
          <div class="form-group">
            <label>Student <span class="required">*</span></label>
            <mat-select formControlName="studentId" class="crm-input" style="padding-top: 10px; padding-bottom: 10px; min-height: 40px; box-sizing: border-box;" placeholder="Select Student">
              <div style="padding: 8px; position: sticky; top: 0; background: white; z-index: 1;">
                <input type="text" (keydown)="$event.stopPropagation()" (input)="filterStudents($event)" placeholder="Search students..." style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; font-size: 14px; outline: none; border-color: #6366f1;">
              </div>
              <mat-option *ngFor="let st of filteredStudents" [value]="st.id">{{ st.fullName }} ({{ st.studentCode }})</mat-option>
            </mat-select>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Application Type <span class="required">*</span></label>
              <select formControlName="applicationTypeId" class="crm-input" [attr.disabled]="isEdit ? true : null">
                <option value="" disabled>Select Type</option>
                <option *ngFor="let ty of types" [value]="ty.id">{{ ty.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Status <span class="required">*</span></label>
              <select formControlName="applicationStatusId" class="crm-input">
                <option value="" disabled>Select Status</option>
                <option *ngFor="let st of statuses" [value]="st.id">{{ st.name }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Colleges <span class="required">*</span></label>
              <mat-select multiple formControlName="collegeIds" class="crm-input" style="padding-top: 10px; padding-bottom: 10px; min-height: 40px; box-sizing: border-box;" placeholder="Select Colleges">
                <mat-select-trigger>
                  <ng-container *ngIf="form.get('collegeIds')?.value as selectedIds">
                    <span *ngIf="selectedIds.length > 0" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 100%;">
                      {{ getCollegeName(selectedIds[0]) }}
                      <span *ngIf="selectedIds.length > 1" style="opacity: 0.75; font-size: 0.9em; margin-left: 4px;">
                        (+{{ selectedIds.length - 1 }} {{ selectedIds.length === 2 ? 'other' : 'others' }})
                      </span>
                    </span>
                  </ng-container>
                </mat-select-trigger>
                <div style="padding: 8px; position: sticky; top: 0; background: white; z-index: 1;">
                  <input type="text" (keydown)="$event.stopPropagation()" (input)="filterColleges($event)" placeholder="Search colleges..." style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; font-size: 14px; outline: none; border-color: #6366f1;">
                </div>
                <mat-option *ngFor="let c of filteredColleges" [value]="c.id">{{ c.name }}</mat-option>
              </mat-select>
            </div>
            <div class="form-group">
              <label>Form Type / Field <span class="required">*</span></label>
              <select formControlName="formTypeId" class="crm-input">
                <option value="" disabled>Select Field</option>
                <option *ngFor="let ft of formTypes" [value]="ft.id">{{ ft.name }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Portal User ID</label>
              <input type="text" formControlName="userId" class="crm-input">
            </div>
            <div class="form-group">
              <label>Portal Password</label>
              <input type="text" formControlName="password" class="crm-input">
            </div>
          </div>

          <div class="form-row" style="grid-template-columns: 1fr;">
            <div class="form-group">
              <label>Applied Date <span class="required">*</span></label>
              <input type="date" formControlName="appliedDate" class="crm-input">
            </div>
          </div>

          <div class="form-group">
            <label>Remarks</label>
            <textarea formControlName="remarks" class="crm-input" placeholder="Remarks..." rows="3"></textarea>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <h4 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #334155;">Form Fee Payment</h4>
          
          <div class="form-row">
            <div class="form-group">
              <label>College Fee Amount (₹)</label>
              <input type="number" formControlName="collegeFeeAmount" class="crm-input" placeholder="0">
            </div>
            <div class="form-group">
              <label>Paid to College By</label>
              <select formControlName="paymentToCollegeMethod" class="crm-input">
                <option value="">N/A (No Fee)</option>
                <option value="Consultancy Card">Consultancy Card</option>
                <option value="Consultancy UPI">Consultancy UPI</option>
                <option value="Student Paid Directly">Student Paid Directly</option>
              </select>
            </div>
          </div>

          <div class="form-row" *ngIf="form.get('paymentToCollegeMethod')?.value && form.get('paymentToCollegeMethod')?.value !== 'Student Paid Directly' && form.get('paymentToCollegeMethod')?.value !== ''">
            <div class="form-group">
              <label>Reimbursement from Student <span class="required">*</span></label>
              <select formControlName="studentReimbursementMethod" class="crm-input">
                <option value="" disabled>Select Method</option>
                <option value="Cash to Staff">Cash to Staff</option>
                <option value="Online to Consultancy">Online to Consultancy</option>
              </select>
            </div>
            <div class="form-group" *ngIf="form.get('studentReimbursementMethod')?.value === 'Online to Consultancy'">
              <label>Transaction Reference <span class="required">*</span></label>
              <input type="text" formControlName="studentTransactionRef" class="crm-input" placeholder="UTR / Ref No">
            </div>
            <div class="form-group" *ngIf="form.get('studentReimbursementMethod')?.value === 'Cash to Staff'">
              <label>Remarks</label>
              <input type="text" formControlName="staffRemarks" class="crm-input" placeholder="Any note...">
            </div>
          </div>
        </form>
      </div>
      
      <div class="dialog-footer">
        <button class="btn-cancel" (click)="close()" [disabled]="isSaving">Cancel</button>
        <button class="btn-submit" (click)="save()" [disabled]="form.invalid || isSaving">
          {{ isSaving ? 'Saving...' : (isEdit ? 'Update' : 'Create') }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container { display: flex; flex-direction: column; background: #fff; border-radius: 12px; overflow: hidden; width: 100%; }
    .dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
    .dialog-title { margin: 0; font-size: 18px; font-weight: 600; color: #0f172a; }
    .close-btn { background: transparent; border: none; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center; border-radius: 6px; padding: 4px; transition: 0.2s; }
    .close-btn:hover { background: #e2e8f0; color: #0f172a; }

    .dialog-content { padding: 24px; }
    
    .crm-form { display: flex; flex-direction: column; gap: 16px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 600; color: #334155; }
    .required { color: #ef4444; }
    
    .crm-input { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; color: #334155; outline: none; transition: all 0.2s; background: #fff; font-family: inherit; }
    textarea.crm-input { resize: vertical; }
    .crm-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
    .crm-input[disabled] { background-color: #f8fafc; color: #94a3b8; cursor: not-allowed; }
    
    .dialog-footer { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #f1f5f9; background: #f8fafc; }
    .btn-cancel { padding: 9px 16px; border: 1px solid #cbd5e1; background: #fff; color: #475569; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: 0.2s; }
    .btn-cancel:hover { background: #f1f5f9; color: #0f172a; }
    .btn-submit { padding: 9px 20px; border: none; background: #6366f1; color: #fff; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: 0.2s; }
    .btn-submit:hover:not([disabled]) { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.25); }
    .btn-submit[disabled] { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class ApplicationDialogComponent implements OnInit {
  isSaving = false;
  isEdit = false;
  form: FormGroup;
  students: any[] = [];
  filteredStudents: any[] = [];
  types: any[] = [];
  statuses: any[] = [];
  formTypes: any[] = [];
  allColleges: any[] = [];
  filteredColleges: any[] = [];
  fixedStudentId = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ApplicationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private service: StudentApplicationService,
    private studentService: StudentService,
    private typeService: ApplicationTypeService,
    private statusService: ApplicationStatusService,
    private formTypeService: FormTypeService,
    private collegeService: CollegeService,
    private collectionService: ApplicationFeeCollectionService,
    private snackBar: MatSnackBar
  ) {
    this.isEdit = !!data.id;
    this.fixedStudentId = !!data.fixedStudentId;
    
    let formattedDate = null;
    if (data.appliedDate) {
      formattedDate = new Date(data.appliedDate).toISOString().split('T')[0];
    } else {
      formattedDate = new Date().toISOString().split('T')[0]; // Default to today
    }

    this.form = this.fb.group({
      studentId: [{ value: data.studentId || data.fixedStudentId || '', disabled: this.isEdit || this.fixedStudentId }, Validators.required],
      applicationTypeId: [{ value: data.applicationTypeId || '', disabled: this.isEdit }, Validators.required],
      applicationStatusId: [data.applicationStatusId || '', Validators.required],
      collegeIds: [data.colleges?.map((c: any) => c.id) || [], Validators.required],
      formTypeId: [data.formTypeId || '', Validators.required],
      userId: [data.userId || ''],
      password: [data.password || ''],
      appliedDate: [formattedDate, [Validators.required, this.futureDateValidator]],
      remarks: [data.remarks || '', Validators.maxLength(1000)],
      
      // Form Fee Fields
      collegeFeeAmount: [data.collegeFeeAmount || null],
      paymentToCollegeMethod: [data.paymentToCollegeMethod || ''],
      studentReimbursementMethod: [data.studentReimbursementMethod || ''],
      studentTransactionRef: [data.studentTransactionRef || ''],
      staffRemarks: [data.staffRemarks || '']
    });

    // Dynamic validation
    this.form.get('paymentToCollegeMethod')?.valueChanges.subscribe(val => {
      const reimburseCtrl = this.form.get('studentReimbursementMethod');
      if (val === 'Consultancy Card' || val === 'Consultancy UPI') {
        reimburseCtrl?.setValidators([Validators.required]);
      } else {
        reimburseCtrl?.clearValidators();
        reimburseCtrl?.setValue('');
      }
      reimburseCtrl?.updateValueAndValidity();
    });

    this.form.get('studentReimbursementMethod')?.valueChanges.subscribe(val => {
      const refCtrl = this.form.get('studentTransactionRef');
      if (val === 'Online to Consultancy') {
        refCtrl?.setValidators([Validators.required]);
      } else {
        refCtrl?.clearValidators();
        refCtrl?.setValue('');
      }
      refCtrl?.updateValueAndValidity();
    });
  }

  futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate > today ? { futureDate: true } : null;
  }

  ngOnInit() {
    forkJoin({
      students: this.studentService.getAll(),
      types: this.typeService.getAll(),
      statuses: this.statusService.getAll(),
      formTypes: this.formTypeService.getAll(),
      collegesReq: this.collegeService.getAll()
    }).subscribe(({ students, types, statuses, formTypes, collegesReq }) => {
      if (students.success) {
        this.students = students.data || [];
        this.filteredStudents = this.students;
      }
      if (collegesReq.success) {
        this.allColleges = collegesReq.data || [];
        this.filteredColleges = this.allColleges;
      }
      if (types.success) {
        const allTypes = types.data || [];
        if (!this.isEdit) {
          this.types = allTypes.filter((t: any) => t.status === 'Active');
        } else {
          const currentTypeId = this.data.applicationTypeId;
          this.types = allTypes.filter((t: any) => t.status === 'Active' || t.id === currentTypeId);
        }
      }
      if (statuses.success) {
        const allStatuses = statuses.data?.sort((a: any, b: any) => a.displayOrder - b.displayOrder) || [];
        if (!this.isEdit) {
          this.statuses = allStatuses.filter((s: any) => s.status === 'Active');
          if (!this.form.get('applicationStatusId')?.value) {
            const pendingStatus = this.statuses.find((s: any) => s.name === 'Pending');
            if (pendingStatus) {
              this.form.patchValue({ applicationStatusId: pendingStatus.id });
            }
          }
        } else {
          const currentStatusId = this.data.applicationStatusId;
          this.statuses = allStatuses.filter((s: any) => s.status === 'Active' || s.id === currentStatusId);
        }
      }
      if (formTypes.success) {
        const allFormTypes = formTypes.data?.sort((a: any, b: any) => a.displayOrder - b.displayOrder) || [];
        if (!this.isEdit) {
          this.formTypes = allFormTypes.filter((f: any) => f.status === 'Active');
        } else {
          const currentFormTypeId = this.data.formTypeId;
          this.formTypes = allFormTypes.filter((f: any) => f.status === 'Active' || f.id === currentFormTypeId);
        }
      }
    });
  }

  filterColleges(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredColleges = this.allColleges.filter(c => c.name.toLowerCase().includes(query));
  }

  getCollegeName(id: string): string {
    const c = this.allColleges.find(col => col.id === id);
    return c ? c.name : '';
  }

  filterStudents(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredStudents = this.students.filter(s => 
      (s.fullName && s.fullName.toLowerCase().includes(query)) || 
      (s.studentCode && s.studentCode.toLowerCase().includes(query))
    );
  }

  save() {
    if (this.form.invalid) return;
    this.isSaving = true;
    
    // getRawValue to include disabled studentId field
    const payload = { ...this.data, ...this.form.getRawValue() };
    
    // ensure ISO date
    payload.appliedDate = new Date(payload.appliedDate).toISOString();

    const request$ = this.isEdit 
      ? this.service.update(payload.id!, payload)
      : this.service.create(payload);

    request$.pipe(
      switchMap(res => {
        if (!res.success) throw new Error(res.message);
        
        const appId = this.isEdit ? payload.id : res.data?.id;
        const collectionValues = this.form.getRawValue();
        
        // Handle Form Fee Collection Saving
        if (collectionValues.paymentToCollegeMethod && collectionValues.paymentToCollegeMethod !== '' && collectionValues.paymentToCollegeMethod !== 'Student Paid Directly' && collectionValues.collegeFeeAmount > 0) {
          const collectionData = {
            applicationId: appId,
            collegeFeeAmount: collectionValues.collegeFeeAmount,
            paymentToCollegeMethod: collectionValues.paymentToCollegeMethod,
            studentReimbursementMethod: collectionValues.studentReimbursementMethod,
            studentTransactionRef: collectionValues.studentTransactionRef,
            staffRemarks: collectionValues.staffRemarks
          };
          
          return this.collectionService.createCollection(collectionData);
        }
        
        return of(res);
      })
    ).subscribe({
      next: (res) => {
        this.snackBar.open('Saved successfully!', 'OK', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'top' });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.snackBar.open(`Error: ${err.message || err}`, 'Close', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'top' });
        this.isSaving = false;
      }
    });
  }

  close() {
    this.dialogRef.close(false);
  }
}
