// src/app/service-centers/service-center-dialog/service-center-dialog.component.ts

import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

// Angular Material Imports
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox'; // For isActive checkbox
import { ServiceCenter } from 'src/app/services/service-centers.service';
import { MaterialModule } from 'src/app/material.module';

// Import ServiceCenter interface from your service file

// Define the data structure for the dialog
export interface DialogData {
  action: string; // 'Add', 'Update', 'Delete'
  serviceCenter: ServiceCenter; // The service center object being edited/deleted
}

@Component({
  selector: 'app-service-center-dialog',
  templateUrl: './service-center-dialog.component.html',
  styleUrls: ['./service-center-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, 
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDialogClose,
    MatCheckboxModule,
    MaterialModule, 
    ReactiveFormsModule
  ]
})
export class ServiceCenterDialogComponent implements OnInit {
  action: string;
  local_data: ServiceCenter; // Use 'ServiceCenter' type directly

  constructor(
    public dialogRef: MatDialogRef<ServiceCenterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.action = data.action;
    // Create a copy to avoid modifying the original object directly until saved
    this.local_data = { ...data.serviceCenter };
  }

  ngOnInit(): void {
    // If it's an 'Add' action, ensure default values for new service center
    if (this.action === 'Add') {

      // 1. Save the pre-filled name that was passed from the constructor.
      const prefilledName = this.local_data.name;

      // 2. Now, create the full, default object,
      //    using the prefilledName.
      this.local_data = {
        id: 0,
        name: prefilledName || '', // <-- Use the saved name here
        address: '',
        mapLocationUrl: '',
        isActive: true
      } as ServiceCenter;
    }
  }

  doAction(): void {
    // Emit the action and the data back to the parent component
    this.dialogRef.close({ event: this.action, data: this.local_data });
  }

  closeDialog(): void {
    this.dialogRef.close({ event: 'Cancel' });
  }
}