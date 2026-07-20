import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize, startWith, Subject, takeUntil } from 'rxjs';
import { ApiResponse } from 'src/app/common/interfaces/common';
import { NotificationSettingsDto, SettingsService } from 'src/app/services/settings.service';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { GlobalSearchService } from 'src/app/services/global-search.service';
import { DealService, PipelineStage } from 'src/app/services/deal.service';

@Component({
  selector: 'app-settings', // <-- CHANGED
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TablerIconsModule,
    RouterLink,
    MatTabsModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    MatTableModule, // Added for pipeline stages
    MatTooltipModule,
  ],
  templateUrl: './settings.component.html', // <-- CHANGED
  styleUrls: ['./settings.component.scss'] // <-- CHANGED
})
export class SettingsComponent implements OnInit, OnDestroy { // <-- CHANGED
  private snackBar = inject(MatSnackBar);
  private settingsService = inject(SettingsService);
  private fb = inject(FormBuilder);
  private globalSearchService = inject(GlobalSearchService);
  private dealService = inject(DealService);

  notificationSettingsForm!: FormGroup;
  isSavingSettings: boolean = false;
  isLoadingSettings: boolean = true; // Renamed from isLoading

  searchTerm: string = '';
  activeTab: 'whatsapp' | 'pipeline' = 'whatsapp';

  // Pipeline Settings State
  pipelineStages: PipelineStage[] = [];
  isLoadingStages: boolean = true;
  editingStageId: number | null = null;
  stageForm!: FormGroup;
  displayedColumns: string[] = ['name', 'order', 'probability', 'color', 'actions'];

  private destroy$ = new Subject<void>();

  constructor() {
    this.notificationSettingsForm = this.fb.group({
      enableWhatsAppNotifications: [false],
      notifyOnReplacementAdd: [{ value: false, disabled: true }],
      notifyOnStatusChange: [{ value: false, disabled: true }]
    });
  }

  ngOnInit(): void {
    this.loadNotificationSettings();
    this.subscribeToMainToggleChanges();
    this.loadPipelineStages();

    this.globalSearchService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe(query => {
        this.searchTerm = query.toLowerCase().trim();
        // You can now use this.searchTerm in your HTML with *ngIf to hide/show specific settings cards
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotificationSettings(): void {
    this.isLoadingSettings = true;
    this.settingsService.getNotificationSettings()
      .pipe(finalize(() => this.isLoadingSettings = false))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // This line is correct and will trigger the subscription
            this.notificationSettingsForm.patchValue(response.data);
          } else {
            this.showError(response.message || 'Failed to load notification settings.');
          }
        },
        error: (err) => {
          this.showError('An error occurred while loading settings.');
          console.error(err);
        }
      });
  }

  subscribeToMainToggleChanges(): void {
    const mainToggle = this.notificationSettingsForm.get('enableWhatsAppNotifications');
    const addToggle = this.notificationSettingsForm.get('notifyOnReplacementAdd');
    const statusToggle = this.notificationSettingsForm.get('notifyOnStatusChange');

    if (mainToggle && addToggle && statusToggle) {
      // Subscribe to the value changes of the main toggle
      mainToggle.valueChanges.pipe(
        startWith(mainToggle.value), // Fire immediately on init
        takeUntil(this.destroy$)
      ).subscribe((isEnabled: boolean) => {
        // Enable or disable the sub-toggles based on the main toggle's value
        if (isEnabled) {
          addToggle.enable();
          statusToggle.enable();
        } else {
          addToggle.disable();
          statusToggle.disable();
        }
      });
    }
  }

  saveNotificationSettings(): void {
    if (this.notificationSettingsForm.invalid) {
      this.showError('Invalid settings form.');
      return;
    }
    
    this.isSavingSettings = true;
    const settings = this.notificationSettingsForm.value as NotificationSettingsDto;

    this.settingsService.updateNotificationSettings(settings)
      .pipe(finalize(() => this.isSavingSettings = false))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showSuccess('Notification settings saved successfully!');
            this.notificationSettingsForm.patchValue(settings); 
            this.notificationSettingsForm.markAsPristine();
          } else {
            this.showError(response.message || 'Failed to save settings.');
          }
        },
        error: (err) => {
          this.showError('An error occurred while saving settings.');
          console.error(err);
        }
      });
  }

  // ============================
  // PIPELINE SETTINGS
  // ============================

  loadPipelineStages(): void {
    this.isLoadingStages = true;
    this.dealService.getAllPipelineStages().subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.pipelineStages = res.data;
        } else {
          this.showError('Failed to load pipeline stages.');
        }
        this.isLoadingStages = false;
      },
      error: () => {
        this.showError('Error loading pipeline stages.');
        this.isLoadingStages = false;
      }
    });
  }

  initEditStage(stage?: PipelineStage): void {
    this.editingStageId = stage ? stage.id : 0;
    this.stageForm = this.fb.group({
      id: [stage ? stage.id : 0],
      name: [stage ? stage.name : '', []],
      order: [stage ? stage.order : 0, []],
      probability: [stage ? stage.probability : 0, []],
      color: [stage ? stage.color : '#6366F1', []]
    });
  }

  cancelEditStage(): void {
    this.editingStageId = null;
  }

  saveStage(): void {
    if (this.stageForm.invalid) return;

    const val = this.stageForm.value;
    const isNew = val.id === 0;
    
    const obs$ = isNew 
      ? this.dealService.createPipelineStage(val) 
      : this.dealService.updatePipelineStage(val.id, val);

    obs$.subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.showSuccess(`Stage ${isNew ? 'added' : 'updated'} successfully.`);
          this.editingStageId = null;
          this.loadPipelineStages();
        } else {
          this.showError('Failed to save pipeline stage.');
        }
      },
      error: () => this.showError('Error saving pipeline stage.')
    });
  }

  deleteStage(id: number): void {
    if (confirm('Are you sure you want to delete this stage? This cannot be undone.')) {
      this.dealService.deletePipelineStage(id).subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.showSuccess('Stage deleted successfully.');
            this.loadPipelineStages();
          } else {
            this.showError(res.message || 'Failed to delete stage. Ensure no deals are associated with it.');
          }
        },
        error: () => this.showError('Error deleting stage.')
      });
    }
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['bg-green-500', 'text-white']
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['bg-red-500', 'text-white']
    });
  }
}