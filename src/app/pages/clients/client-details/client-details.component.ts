import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClientManagementService } from '../../../services/client-management.service';
import { ApplicationService } from '../../../services/application.service';
import { TablerIconsModule } from 'angular-tabler-icons';

@Component({
  selector: 'app-client-details',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatTabsModule, 
    MatCardModule, 
    MatIconModule, 
    MatButtonModule, 
    MatTableModule,
    MatProgressSpinnerModule,
    TablerIconsModule
  ],
  templateUrl: './client-details.component.html',
  styleUrls: ['./client-details.component.scss']
})
export class ClientDetailsComponent implements OnInit {
  clientId: string | null = null;
  clientDetails: any = null;
  applications: any[] = [];
  
  isLoadingDetails = true;
  isLoadingApps = true;
  
  displayedColumns: string[] = ['Title', 'Status', 'CreatedAt', 'actions'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientService: ClientManagementService,
    private applicationService: ApplicationService
  ) {}

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id');
    if (this.clientId) {
      this.loadClientDetails(this.clientId);
      this.loadApplications(this.clientId);
    }
  }

  loadClientDetails(id: string) {
    this.isLoadingDetails = true;
    this.clientService.getClient(parseInt(id, 10)).subscribe({
      next: (res: any) => {
        // Backend returns client details object inside res.data
        const data = res.data;
        let fullName = '';
        const firstName = data.firstName || data.FirstName || data.first_name;
        const lastName = data.lastName || data.LastName || data.last_name;
        
        if (firstName || lastName) {
            fullName = `${firstName || ''} ${lastName || ''}`.trim();
        } else {
            fullName = data.fullName || data.FullName;
        }
        
        this.clientDetails = {
            ...data,
            computedFullName: fullName
        };
        this.isLoadingDetails = false;
      },
      error: (err) => {
        console.error('Error fetching client details:', err);
        this.isLoadingDetails = false;
      }
    });
  }

  loadApplications(id: string) {
    this.isLoadingApps = true;
    this.applicationService.getApplications(parseInt(id, 10)).subscribe({
      next: (res: any) => {
        this.applications = Array.isArray(res.data) ? res.data : (res.data?.records || []);
        this.isLoadingApps = false;
      },
      error: (err) => {
        console.error('Error fetching applications:', err);
        this.isLoadingApps = false;
      }
    });
  }

  viewApplication(appId: number) {
    this.router.navigate(['/dashboard/applications', appId]);
  }
}
