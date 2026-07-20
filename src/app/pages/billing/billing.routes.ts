import { Routes } from '@angular/router';

export const BillingRoutes: Routes = [
  {
    path: 'purchase-invoices',
    loadComponent: () => import('./purchases/purchase-invoice-list/purchase-invoice-list.component').then(m => m.PurchaseInvoiceListComponent),
    data: { 
      title: 'Purchase Invoices',
      searchPlaceholder: 'Search Invoices...',
      showFab: true,
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Purchase Invoices' }]
    }
  },
  {
    path: 'sales-invoices',
    loadComponent: () => import('./sales/sales-invoice-list/sales-invoice-list.component').then(m => m.SalesInvoiceListComponent),
    data: { 
      title: 'Sales Invoices',
      searchPlaceholder: 'Search Invoices...',
      showFab: true,
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Sales Invoices' }]
    }
  }
];
