import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog'; 
import { SubscriptionService } from './subscription.service'; 
import { SubscriptionRestrictionDialogComponent } from '../common/component/subscription-restriction-dialog/subscription-restriction-dialog.component';
import { Router } from '@angular/router';

export interface FabMenuItem {
  id: string;
  icon: string;
  name: string;
  route: string;
}

export interface FabConfig {
  icon: string;
  menu?: FabMenuItem[];
}

@Injectable({
  providedIn: 'root'
})
export class FabClickService {

  private fabConfigSubject = new BehaviorSubject<FabConfig | null>(null);
  public fabConfig$ = this.fabConfigSubject.asObservable();

  private fabClickSubject = new Subject<void>();
  public fabClick$ = this.fabClickSubject.asObservable();
  
  private menuItemClickSubject = new Subject<FabMenuItem>();
  public menuItemClick$ = this.menuItemClickSubject.asObservable();

  // [NEW] Local state for subscription status
  private isSubscriptionActive = true;

  constructor(
    private dialog: MatDialog,              
    private subService: SubscriptionService,
    private router: Router
  ) { 
    // [NEW] Keep track of status automatically
    this.subService.isSubscriptionActive$.subscribe(active => {
      this.isSubscriptionActive = active;
    });
  }

  // --- Public Methods ---

  /** * [UPDATED] Intercepts the click! 
   * If expired -> Show Dialog (unless ignored).
   * If active -> Emit event to component.
   */
  public notifyFabClick(): void {
    if (!this.isSubscriptionActive && !this.router.url.includes('/support')) {
       this.openRestrictionDialog();
       return; // <--- STOP HERE. Component will never know it was clicked.
    }

    this.fabClickSubject.next();
  }

  // Same logic can be applied here if menu items represent "Create" actions
  public notifyMenuItemClick(item: FabMenuItem): void {
    // Optional: Add logic here if specific menu items (like 'add_new') need restricting
    // if (!this.isSubscriptionActive && item.id === 'create') { ... }

    this.menuItemClickSubject.next(item);
  }

  public show(config: FabConfig): void {
    this.fabConfigSubject.next(config);
  }

  public hide(): void {
    this.fabConfigSubject.next(null);
  }

  // [NEW] Helper to open the dialog
  private openRestrictionDialog() {
    this.dialog.open(SubscriptionRestrictionDialogComponent, {
      width: '450px',
      autoFocus: false,
      panelClass: 'restriction-dialog-panel'
    });
  }
}