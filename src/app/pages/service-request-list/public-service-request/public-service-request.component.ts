import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ServiceRequestService, ServiceRequestCreateDto } from 'src/app/services/service-request.service';

@Component({
  selector: 'app-public-service-request',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TablerIconsModule
  ],
  templateUrl: './public-service-request.component.html',
  styleUrls: ['./public-service-request.component.scss']
})
export class PublicServiceRequestComponent implements OnInit {
  requestForm: FormGroup;
  isLoading = false;
  submitted = false;
  ticketCode: string | null = null;
  tenantId: string | null = null;
  companyName: string = '';

  // Visual Categories for the Grid
  categories = [
    { name: 'Hardware', icon: 'device-laptop', label: 'Laptop / PC' },
    { name: 'Network', icon: 'wifi', label: 'Internet / WiFi' },
    { name: 'Printer', icon: 'printer', label: 'Printer / Scanner' },
    { name: 'CCTV', icon: 'video', label: 'CCTV Camera' },
    { name: 'Software', icon: 'brand-windows', label: 'Software / OS' },
    { name: 'Other', icon: 'help', label: 'Other Issue' }
  ];

  selectedCategory: string | null = null;

  constructor(
    private fb: FormBuilder,
    private serviceRequestService: ServiceRequestService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.requestForm = this.fb.group({
      guestName: ['', Validators.required],
      guestPhone: ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]],
      category: ['', Validators.required], // Controlled by visual selection
      description: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.tenantId = this.route.snapshot.paramMap.get('tenantId');

    if (this.tenantId) {
      this.fetchPublicCompanyName(this.tenantId);
    }
  }

  fetchPublicCompanyName(id: string): void {
    this.serviceRequestService.getPublicCompanyInfo(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          // Assuming backend returns { companyName: 'Name', ... }
          this.companyName = res.data.companyName; 
        }
      },
      error: (err) => console.error('Could not load company info', err)
    });
  }

  selectCategory(categoryName: string): void {
    this.selectedCategory = categoryName;
    this.requestForm.patchValue({ category: categoryName });
  }

  onSubmit(): void {
    if (this.requestForm.invalid || !this.tenantId) {
      this.requestForm.markAllAsTouched(); // Trigger error messages
      return;
    }

    this.isLoading = true;
    
    const dto: ServiceRequestCreateDto = {
      tenantId: this.tenantId,
      ...this.requestForm.value
    };

    this.serviceRequestService.createPublicRequest(dto).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.submitted = true;
          this.ticketCode = res.data?.ticketCode;
        } else {
          this.snackBar.open(res.message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error(err);
        this.snackBar.open('Failed to submit request.', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }

  resetForm(): void {
    this.submitted = false;
    this.ticketCode = null;
    this.selectedCategory = null;
    this.requestForm.reset();
  }
}