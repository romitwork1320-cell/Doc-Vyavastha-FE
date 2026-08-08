import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, WorkspaceSelection } from 'src/app/services/auth.service';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-workspace-selection',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, FormsModule, ReactiveFormsModule, MatProgressSpinnerModule],
  templateUrl: './workspace-selection.component.html',
  styleUrls: ['./workspace-selection.component.scss']
})
export class WorkspaceSelectionComponent implements OnInit {
  mode: 'select' | 'create' = 'select';
  workspaces: WorkspaceSelection[] = [];
  isLoading = false;
  errorMessage = '';

  createForm: FormGroup;
  workspaceType: 'PERSONAL' | 'ORGANIZATION' = 'ORGANIZATION';
  organizationTypes: any[] = [];

  constructor(
    private router: Router, 
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      name: ['', Validators.required], // Required by default because workspaceType initializes to ORGANIZATION
      email: ['', Validators.email],
      phone: [''],
      orgType: ['']
    });

    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { workspaces?: WorkspaceSelection[], action?: string };
    
    if (state?.action === 'create') {
      this.mode = 'create';
    } else if (state?.workspaces) {
      this.mode = 'select';
      this.workspaces = state.workspaces;
    } else {
      // Default fallback if someone reloads the page
      this.router.navigate(['/login']);
    }
  }

  ngOnInit(): void {
    this.authService.getOrganizationTypes().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.organizationTypes = res.data;
        }
      }
    });
  }

  get hasPersonalAccount(): boolean {
    return this.workspaces.some(w => w.workspaceType === 'PERSONAL');
  }

  switchMode(mode: 'select' | 'create') {
    this.mode = mode;
    if (mode === 'create' && this.hasPersonalAccount) {
      this.workspaceType = 'ORGANIZATION';
    }
  }

  setWorkspaceType(type: 'PERSONAL' | 'ORGANIZATION') {
    this.workspaceType = type;
    if (type === 'ORGANIZATION') {
      this.createForm.get('name')?.setValidators([Validators.required]);
      this.createForm.get('email')?.setValidators([Validators.required, Validators.email]);
      this.createForm.get('phone')?.setValidators([Validators.required]);
      this.createForm.get('orgType')?.setValidators([Validators.required]);
    } else {
      this.createForm.get('name')?.clearValidators();
      this.createForm.get('email')?.clearValidators();
      this.createForm.get('phone')?.clearValidators();
      this.createForm.get('orgType')?.clearValidators();
    }
    this.createForm.get('name')?.updateValueAndValidity();
    this.createForm.get('email')?.updateValueAndValidity();
    this.createForm.get('phone')?.updateValueAndValidity();
    this.createForm.get('orgType')?.updateValueAndValidity();
  }

  selectWorkspace(workspace: WorkspaceSelection): void {
    if (!workspace.isActive) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.selectTenant(workspace.tenantId, workspace.workspaceType)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res) => {
          // handleAuthResponse inside selectTenant takes care of next routing
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Could not access the selected workspace.';
        }
      });
  }

  createWorkspace() {
    if (this.createForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const val = this.createForm.value;
    const selectedOrgType = this.organizationTypes.find(t => t.id === val.orgType);

    const payload = {
      workspaceType: this.workspaceType,
      name: this.workspaceType === 'PERSONAL' ? `${val.firstName} ${val.lastName}` : val.name,
      firstName: val.firstName,
      lastName: val.lastName,
      email: val.email,
      phone: val.phone,
      orgType: selectedOrgType ? selectedOrgType.name : undefined,
      orgTypeId: val.orgType // because form holds the ID now
    };

    this.authService.createWorkspace(payload)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res) => {
          // handleAuthResponse inside createWorkspace takes care of next routing
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Could not create workspace.';
        }
      });
  }
}