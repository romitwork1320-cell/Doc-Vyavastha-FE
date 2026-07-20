import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PageTitleService {
  // Set 'Dashboard' as the default title
  private pageTitle = new BehaviorSubject<string>('Dashboard');

  /**
   * Public observable that the header will subscribe to.
   */
  public pageTitle$ = this.pageTitle.asObservable();

  constructor() { }

  /**
   * Call this from your page components (e.g., Replacements)
   * to update the header title.
   * @param title The new title to display.
   */
  public setTitle(title: string): void {
    this.pageTitle.next(title);
  }
}