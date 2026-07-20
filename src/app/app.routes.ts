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
        path: 'branches',
        loadComponent: () => import('./pages/branches/branches.component').then(m => m.BranchesComponent),
        data: { title: 'Branch Management', showFab: true, urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Branches' }] }
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
      },
      // Student Management Module
      {
        path: '',
        loadChildren: () => import('./pages/students/students.routes').then(m => m.StudentsRoutes)
      },
      {
        path: 'daily-collections',
        loadComponent: () => import('./pages/form-fee-collections/form-fee-collections.component').then(m => m.FormFeeCollectionsComponent),
        data: { title: 'Daily Collections' }
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
      { path: 'workspace-selection', loadComponent: () => import('./pages/authentication/workspace-selection/workspace-selection.component').then(m => m.WorkspaceSelectionComponent) },
      { path: 'branch-selection', loadComponent: () => import('./pages/authentication/branch-selection/branch-selection.component').then(m => m.BranchSelectionComponent) },
      { path: 'error', loadComponent: () => import('./pages/authentication/error/error.component').then(m => m.AppErrorComponent) },
    ]
  },

  { path: '**', redirectTo: '/error' }
];