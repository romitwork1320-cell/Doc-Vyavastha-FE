import { NavItem } from './nav-item/nav-item';

export const navItems: NavItem[] = [
  { navCap: 'Workspace', iconName: 'home' },
  { displayName: 'Dashboard',         iconName: 'layout-dashboard', route: '/dashboard' },

  { navCap: 'Student Data', divider: true, iconName: 'school' },
  { displayName: 'Student Listing',   iconName: 'users',            route: '/students' },
  { displayName: 'Applications',      iconName: 'clipboard-list',   route: '/student-applications' },
  { displayName: 'Daily Collections', iconName: 'cash',             route: '/daily-collections' },

  { navCap: 'APP CONFIGURATION' },
  { displayName: 'Categories',        iconName: 'category',           route: '/student-categories' },
  { displayName: 'Castes',            iconName: 'tag',                route: '/student-castes' },
  { displayName: 'Colleges',          iconName: 'building',           route: '/colleges' },
  { displayName: 'Code Configs',      iconName: 'tools',              route: '/student-code-configurations' },
  { displayName: 'Code Sequences',    iconName: 'list-numbers',       route: '/student-code-sequences' },
  { displayName: 'Application Types', iconName: 'file-text',          route: '/application-types' },
  { displayName: 'Application Statuses', iconName: 'status-change',   route: '/application-statuses' },
  { displayName: 'Form Types',        iconName: 'list-details',       route: '/form-types' },
  { navCap: 'Fee Settings' },
  { displayName: 'Fee Types',         iconName: 'receipt-2',          route: '/fee-types' },


  { navCap: 'Administration', divider: true, iconName: 'shield' },
  { displayName: 'Teams & Users',     iconName: 'users',            route: '/teams' },
  { displayName: 'Branch Management', iconName: 'building-store',   route: '/branches' },
  { displayName: 'User Activity Log', iconName: 'history',          route: '/user-activity' },
  { displayName: 'Subscription',      iconName: 'credit-card',      route: '/subscription' },
  { displayName: 'Support',           iconName: 'headset',          route: '/support' },
  { displayName: 'My Profile',        iconName: 'user-circle',      route: '/my-profile' },
  { displayName: 'System Settings',   iconName: 'settings',         route: '/settings' },
];