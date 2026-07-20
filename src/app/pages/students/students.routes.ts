import { Routes } from '@angular/router';

export const StudentsRoutes: Routes = [
  // Core Student Routes
  {
    path: 'students',
    loadComponent: () => import('./student-list/student-list.component').then(m => m.StudentListComponent),
    data: { title: 'Students', showFab: true, urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Students' }] }
  },
  {
    path: 'students/view/:id',
    loadComponent: () => import('./student-details/student-details.component').then(m => m.StudentDetailsComponent),
    data: { title: 'Student Details', urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Students', url: '/students' }, { title: 'Details' }] }
  },
  
  // Student Applications
  {
    path: 'student-applications',
    loadComponent: () => import('./student-applications/student-applications.component').then(m => m.StudentApplicationsComponent),
    data: { title: 'Student Applications', showFab: true, urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Applications' }] }
  },
  {
    path: 'student-applications/view/:id',
    loadComponent: () => import('./student-applications/application-details/application-details.component').then(m => m.ApplicationDetailsComponent),
    data: { title: 'Application Details', urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Applications', url: '/student-applications' }, { title: 'Details' }] }
  },

  // Configuration Routes
  {
    path: 'student-categories',
    loadComponent: () => import('./student-categories/student-categories.component').then(m => m.StudentCategoriesComponent),
    data: { title: 'Student Categories', showFab: true, urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Categories' }] }
  },
  {
    path: 'student-castes',
    loadComponent: () => import('./student-castes/student-castes.component').then(m => m.StudentCastesComponent),
    data: { title: 'Student Castes', showFab: true, urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Castes' }] }
  },
  {
    path: 'colleges',
    loadComponent: () => import('../colleges/colleges.component').then(m => m.CollegesComponent),
    data: { title: 'Colleges', showFab: true, urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Colleges' }] }
  },
  {
    path: 'student-code-configurations',
    loadComponent: () => import('./student-code-configs/student-code-configs.component').then(m => m.StudentCodeConfigsComponent),
    data: { title: 'Student Code Configs', showFab: true, urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Code Configs' }] }
  },
  {
    path: 'student-code-sequences',
    loadComponent: () => import('./student-code-sequences/student-code-sequences.component').then(m => m.StudentCodeSequencesComponent),
    data: { title: 'Student Code Sequences', showFab: true, urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Code Sequences' }] }
  },
  {
    path: 'application-types',
    loadComponent: () => import('./application-types/application-types.component').then(m => m.ApplicationTypesComponent),
    data: { title: 'Application Types', showFab: true, urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Application Types' }] }
  },
  {
    path: 'application-statuses',
    loadComponent: () => import('./application-statuses/application-statuses.component').then(m => m.ApplicationStatusesComponent),
    data: { title: 'Application Statuses', showFab: true, urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Application Statuses' }] }
  },
  {
    path: 'form-types',
    loadComponent: () => import('./form-types/form-types.component').then(m => m.FormTypesComponent),
    data: { title: 'Form Types', showFab: true, urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Form Types' }] }
  },
  {
    path: 'fee-types',
    loadComponent: () => import('./fee-types/fee-types.component').then(m => m.FeeTypesComponent),
    data: { title: 'Fee Types', showFab: true, urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Fee Types' }] }
  }
];
