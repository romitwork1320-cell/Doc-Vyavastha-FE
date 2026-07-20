import { Component, Inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ServiceRequest } from 'src/app/services/service-request.service';

@Component({
  selector: 'app-service-request-view-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    MatDialogModule, 
    MatButtonModule, 
    TablerIconsModule
  ],
  providers: [DatePipe],
  templateUrl: './service-request-view-dialog.component.html', // ✅ Link to HTML
  styleUrls: ['./service-request-view-dialog.component.scss']   // ✅ Link to SCSS
})
export class ServiceRequestViewDialogComponent {
  
  constructor(@Inject(MAT_DIALOG_DATA) public data: ServiceRequest) {}

  getStatusClass(status: string): string {
    return status ? status.toLowerCase() : '';
  }
}