import { Injectable } from '@angular/core';
import { MatMenu } from '@angular/material/menu';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GlobalFilterService {

  // --- 1. Menu Instance Logic ---
  private filterMenuSource = new BehaviorSubject<MatMenu | null>(null);
  public filterMenu$ = this.filterMenuSource.asObservable();

  // --- 2. NEW: Filter Active State Logic ---
  private isFilterActiveSource = new BehaviorSubject<boolean>(false);
  public isFilterActive$ = this.isFilterActiveSource.asObservable();

  constructor() { }

  /**
   * Called by page component to register its menu.
   */
  public setFilterMenu(menu: MatMenu | null): void {
    this.filterMenuSource.next(menu);
  }

  /**
   * Called by page component to clear menu and reset state.
   */
  public clearFilterMenu(): void {
    this.filterMenuSource.next(null);
    // Reset active state when leaving the page
    this.isFilterActiveSource.next(false); 
  }

  /**
   * NEW: Called by page component to tell the header if a filter is currently applied.
   * @param isActive true if filter is applied (e.g. selectedStatus !== ''), false otherwise
   */
  public setFilterActive(isActive: boolean): void {
    this.isFilterActiveSource.next(isActive);
  }
}