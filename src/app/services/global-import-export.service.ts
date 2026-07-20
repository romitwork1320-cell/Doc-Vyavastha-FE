import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface ExportState {
  isExporting: boolean;
  progress: number;
}

// --- NEW: Define the shape of our buttons ---
export interface CustomAction {
  text: string;
  icon: string;
  disabled: boolean;
}

export interface HeaderActions {
  import?: boolean;
  export?: boolean;
  trash?: boolean;
  customAction?: CustomAction;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalImportExportService {

  // --- REPLACED: Use the new HeaderActions interface ---
  private state = new BehaviorSubject<HeaderActions>({});
  public currentState$ = this.state.asObservable(); // Renamed for clarity

  // State control for the export button (unchanged)
  private exportState = new BehaviorSubject<ExportState>({ isExporting: false, progress: 0 });
  public exportState$ = this.exportState.asObservable();
  public trashClick$ = new Subject<void>();

  // --- Click event subjects ---
  public importClick$ = new Subject<void>(); // Renamed for clarity
  public exportClick$ = new Subject<void>(); // Renamed for clarity
  public customActionClick$ = new Subject<void>(); // --- NEW ---

  public get currentState(): ExportState {
    return this.exportState.value;
  }

  constructor() { }

  /**
   * Called by page components (or router logic) in ngOnInit.
   */
  public show(actions: HeaderActions): void {
    this.state.next(actions);
  }

  /**
   * Called by page components in ngOnDestroy.
   */
  public hide(): void {
    this.state.next({});
    this.setExportState(false, 0); // Reset state
  }

  // --- NEW: Method to update the custom action button state (e.g., "Download (2)") ---
  public setCustomActionState(newState: Partial<CustomAction>): void {
    const currentState = this.state.getValue();
    if (currentState.customAction) {
      this.state.next({
        ...currentState,
        customAction: {
          ...currentState.customAction,
          ...newState
        }
      });
    }
  }

  /**
   * Called by the Header when the import button is clicked.
   */
  public notifyImportClick(): void {
    this.importClick$.next();
  }

  /**
   * Called by the Header when the export button is clicked.
   */
  public notifyExportClick(): void {
    this.exportClick$.next();
  }

  public notifyTrashClick(): void { 
    this.trashClick$.next();
  }
  
  // --- NEW: Called by the Header when the custom button is clicked ---
  public notifyCustomActionClick(): void {
    this.customActionClick$.next();
  }

  /**
   * Called by the Page Component to update the export button's state.
   */
  public setExportState(isExporting: boolean, progress: number): void {
    this.exportState.next({ isExporting, progress });
  }
}