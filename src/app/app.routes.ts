import { Routes } from '@angular/router';
import { FullComponent } from './layouts/full/full.component';
import { BlankComponent } from './layouts/blank/blank.component';
import { AuthGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // CRM App Shell (authenticated layout)
  {
    path: '',
    component: FullComponent,
    canActivate: [AuthGuard],
    children: [
      // Dashboard
      {
        path: 'dashboard',
        loadChildren: () => import('./pages/pages.routes').then(m => m.PagesRoutes),
        data: { title: 'Dashboard', urls: [{ title: 'Dashboard' }] }
      },
      // Super Admin
      {
        path: 'super-admin/dashboard',
        loadComponent: () => import('./pages/super-admin/super-admin-dashboard.component').then(m => m.SuperAdminDashboardComponent),
        data: { title: 'Super Admin Dashboard' }
      },
      {
        path: 'super-admin/organization-types',
        loadComponent: () => import('./pages/super-admin/organization-types/organization-types-list/organization-types-list.component').then(m => m.OrganizationTypesListComponent),
        data: { title: 'Organization Types' }
      },
      {
        path: 'super-admin/document-types',
        loadComponent: () => import('./pages/super-admin/document-types/document-types-list/document-types-list.component').then(m => m.DocumentTypesListComponent),
        data: { title: 'Document Types' }
      },
      {
        path: 'super-admin/templates',
        loadComponent: () => import('./pages/super-admin/templates/templates-list/templates-list.component').then(m => m.TemplatesListComponent),
        data: { title: 'Application Templates' }
      },
      // CRM Modules
      // Account & Admin
      {
        path: 'user-activity',
        loadComponent: () => import('./pages/starter/recent-activity/recent-activity.component').then(m => m.AppRecentActivityComponent),
        data: { title: 'User Activity Log' }
      },
      {
        path: 'teams',
        loadComponent: () => import('./pages/teams/teams.component').then(m => m.TeamsComponent),
        data: { title: 'Teams', showFab: true }
      },

      {
        path: 'subscription',
        loadComponent: () => import('./pages/subscription/subscription.component').then(m => m.SubscriptionComponent),
        data: { title: 'Subscription & Billing' }
      },
      {
        path: 'support',
        loadComponent: () => import('./pages/support-list/support-list.component').then(m => m.SupportListComponent),
        data: { title: 'Support Tickets', showFab: true }
      },
      {
        path: 'my-profile',
        loadComponent: () => import('./pages/my-profile/my-profile.component').then(m => m.MyProfileComponent),
        data: { title: 'My Profile' }
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/setting/settings.component').then(m => m.SettingsComponent),
        data: { title: 'Settings' }
      }
    ]
  },

  // Auth pages (blank layout)
  {
    path: '',
    component: BlankComponent,
    children: [
      { path: 'login', loadComponent: () => import('./pages/authentication/boxed-login/boxed-login.component').then(m => m.AppBoxedLoginComponent) },
      { path: 'register', redirectTo: '/login' },
      { path: 'workspaces', loadComponent: () => import('./pages/authentication/workspace-selection/workspace-selection.component').then(m => m.WorkspaceSelectionComponent) },
      { path: 'branch-selection', loadComponent: () => import('./pages/authentication/branch-selection/branch-selection.component').then(m => m.BranchSelectionComponent) },
      { path: 'secure-upload/:token', loadComponent: () => import('./pages/applications/magic-link-upload/magic-link-upload.component').then(m => m.MagicLinkUploadComponent) },
      { path: 'error', loadComponent: () => import('./pages/authentication/error/error.component').then(m => m.AppErrorComponent) },
    ]
  },

  { path: '**', redirectTo: '/error' }
];