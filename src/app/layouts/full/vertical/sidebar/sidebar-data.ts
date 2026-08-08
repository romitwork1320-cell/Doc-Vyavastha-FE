import { NavItem } from './nav-item/nav-item';

export const navItems: NavItem[] = [
  { navCap: 'Workspace', iconName: 'home' },
  { displayName: 'Dashboard', iconName: 'layout-dashboard', route: '/dashboard', exactMatch: true },


  { navCap: 'Connections', divider: true, iconName: 'users' },
  { displayName: 'Clients', iconName: 'users', route: '/dashboard/clients' },
  { displayName: 'Organizations', iconName: 'building', route: '/dashboard/client-organizations' },
  { navCap: 'Workspace', divider: true, iconName: 'briefcase' },
  { displayName: 'Applications', iconName: 'file-invoice', route: '/dashboard/applications' },
  { displayName: 'Document Vault', iconName: 'folder', route: '/dashboard/document-vault' },

  { navCap: 'Administration', divider: true, iconName: 'shield' },
  { displayName: 'KYC Status', iconName: 'file-certificate', route: '/dashboard/kyc-status' },
  { displayName: 'Teams & Users', iconName: 'users', route: '/teams' },
  { displayName: 'Subscription', iconName: 'credit-card', route: '/subscription' },
  { displayName: 'Profile', iconName: 'user-circle', route: '/my-profile' },
  { displayName: 'Settings', iconName: 'settings', route: '/settings' },
  { displayName: 'Support', iconName: 'headset', route: '/support' },
];