import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

import { OrganizationDashboardComponent } from '../organization/dashboard/dashboard.component';
import { ClientDashboardComponent } from '../client/dashboard/dashboard.component';

@Component({
  selector: 'app-erp-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    OrganizationDashboardComponent,
    ClientDashboardComponent
  ],
  templateUrl: './erp-dashboard.component.html'
})
export class ErpDashboardComponent implements OnInit {
  isClient = false;
  isOrganization = false;

  constructor(public authService: AuthService) {}

  ngOnInit() {
    this.isClient = this.authService.getUserRole() === 'Client';
    this.isOrganization = this.authService.isOrganization();
  }
}
