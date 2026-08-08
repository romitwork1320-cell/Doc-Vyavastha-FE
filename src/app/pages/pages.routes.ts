import { Routes } from '@angular/router';
import { ErpDashboardComponent } from './erp-dashboard/erp-dashboard.component';
import { ClientsListComponent } from './clients/clients-list/clients-list.component';
import { KycStatusComponent } from './erp-dashboard/kyc-status/kyc-status.component';
import { ClientOrganizationsComponent } from './client-portal/organizations/organizations.component';

export const PagesRoutes: Routes = [
  {
    path: '',
    component: ErpDashboardComponent,
  },
  {
    path: 'clients',
    component: ClientsListComponent,
  },
  {
    path: 'clients/:id',
    loadComponent: () => import('./clients/client-details/client-details.component').then(m => m.ClientDetailsComponent)
  },
  {
    path: 'kyc-status',
    component: KycStatusComponent,
  },
  {
    path: 'client-organizations',
    component: ClientOrganizationsComponent,
  },
  {
    path: 'client-organizations/:id',
    loadComponent: () => import('./client-portal/organizations/organization-details/organization-details.component').then(m => m.OrganizationDetailsComponent),
  },
  {
    path: 'document-vault',
    loadComponent: () => import('./client-portal/document-vault/document-vault.component').then(m => m.DocumentVaultComponent)
  },
  {
    path: 'applications',
    loadComponent: () => import('./applications/application-list/application-list.component').then(m => m.ApplicationListComponent)
  },
  {
    path: 'applications/:id',
    loadComponent: () => import('./applications/application-details/application-details.component').then(m => m.ApplicationDetailsComponent)
  },
  {
    path: 'magic-link',
    loadComponent: () => import('./applications/magic-link-upload/magic-link-upload.component').then((m) => m.MagicLinkUploadComponent)
  }
];
