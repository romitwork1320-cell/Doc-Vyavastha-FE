import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { UserActivityService, UserActivity } from 'src/app/services/user-activity.service';
import { AuthService } from 'src/app/services/auth.service';
import { DashboardService } from 'src/app/services/dashboard.service'; 
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, distinctUntilChanged } from 'rxjs/operators';
import { PaginationRequestDto } from 'src/app/common/interfaces/common';


interface ChangeItem {
  fullKey: string;
  productName: string | null;
  fieldName: string;
  old: any;
  new: any;
}

interface ActivityView extends UserActivity {
  changesList: ChangeItem[];
}

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconsModule],
  templateUrl: './recent-activity.component.html',
  styleUrls: ['./recent-activity.component.scss']
})
export class AppRecentActivityComponent implements OnInit, OnDestroy {
  @Input() entityId?: string;
  
  activities: ActivityView[] = [];
  expandedItems = new Set<number>();
  
  @ViewChild('timelineContainer') timelineContainer!: ElementRef;

  // --- Pagination & Loading State ---
  isLoading = true;
  isLoadingMore = false;
  currentPage = 0;
  pageSize = 10;
  hasMoreData = true;



  private destroy$ = new Subject<void>(); 

  constructor(
    private authService: AuthService,
    private activityService: UserActivityService,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    // Load initial data
    this.loadData(true);
    this.dashboardService.activityUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Silently reload from page 0 to grab the absolute newest logs
        this.loadData(true); 
      });

    this.authService.activeBranchId$
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe(branchId => {
        if (branchId) {
          this.loadData(true);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  loadData(reset: boolean = false): void {
    if (reset) {
      this.currentPage = 0;
      this.hasMoreData = true;
      if (this.activities.length === 0) this.isLoading = true; // Only show main spinner if empty
    } else {
      if (!this.hasMoreData || this.isLoadingMore) return;
      this.isLoadingMore = true; // Show bottom spinner
    }

    const request: PaginationRequestDto = {
      pageIndex: this.currentPage,
      pageSize: this.pageSize,
      filter: '',
      sortColumn: 'CreatedOn', // Assuming you sort by date
      sortDirection: 'desc'
    };

    const fetchObservable = this.entityId 
      ? this.activityService.getEntityActivity(this.entityId, request)
      : this.activityService.getRecentActivity(request);

    fetchObservable.subscribe({
      next: (res: any) => { // Using any to bypass strict type check if service isn't updated yet
        if (res.success && res.data) {
          const newLogs = res.data.map((log: any) => ({
            ...log,
            changesList: this.getChangesList(log.changes) 
          })).filter((log: ActivityView) => {
             // If it's an update (PUT) and we filtered out all changes, don't show the empty block
             if ((log.method === 'PUT' || log.method === 'put') && log.changesList.length === 0) {
               return false;
             }
             return true;
          });

          if (reset) {
            this.activities = newLogs;
          } else {
            this.activities = [...this.activities, ...newLogs];
          }

          this.hasMoreData = newLogs.length === this.pageSize;
          this.currentPage++;
        }
        this.isLoading = false;
        this.isLoadingMore = false;
      },
      error: (err) => {
        console.error('Error fetching activity', err);
        this.isLoading = false;
        this.isLoadingMore = false;
      }
    });
  }

  onScroll(event: Event): void {
    if (!this.isLoading && !this.isLoadingMore && this.hasMoreData) {
      const element = event.target as HTMLElement;
      const threshold = 100; // Load next page when 100px from the bottom
      if (element.scrollHeight - element.scrollTop - element.clientHeight <= threshold) {
        this.loadData(false); // False = Append next page
      }
    }
  }

  toggleExpand(id: number): void {
    if (this.expandedItems.has(id)) {
      this.expandedItems.delete(id);
    } else {
      this.expandedItems.add(id);
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedItems.has(id);
  }

  // ... (Keep all your existing formatting helpers: formatProductName, formatFieldName, formatValue, getDotColor, formatAction, formatMessage, getChangesList, extractEntityName, extractIdFromUrl exactly as they are) ...

  formatProductName(name: string | null): string {
    if (!name) return '';
    let cleanName = name.replace(/^\(R\)\s*/i, '').trim();
    if (cleanName.length > 35) {
      return cleanName.substring(0, 35) + '...';
    }
    return cleanName;
  }

  formatFieldName(key: string): string {
    if (!key) return '';
    if (key.includes(' - ')) {
      const parts = key.split(' - ');
      key = parts[parts.length - 1]; 
    }
    const result = key.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  formatValue(val: any, fieldName: string = ''): string {
    if (val === null || val === undefined || val === '') return '-';

    const str = String(val);
    return str.length > 30 ? str.substring(0, 30) + '...' : str;
  }

  getDotColor(method: string): string {
    switch (method?.toUpperCase()) {
      case 'POST': return 'bg-success';
      case 'PUT': return 'bg-warning';
      case 'DELETE': return 'bg-error';
      default: return 'bg-primary';
    }
  }

  formatAction(method: string): string {
    const m = (method || '').toUpperCase();
    if (m === 'POST') return 'Created';
    if (m === 'PUT') return 'Updated';
    if (m === 'DELETE') return 'Deleted';
    return 'Viewed';
  }

  formatMessage(log: UserActivity): string {
    let entity = this.extractEntityName(log.url);
    if (entity.endsWith('s') && !entity.toLowerCase().endsWith('ss')) {
        entity = entity.slice(0, -1);
    }
    
    // Attempt to extract an identifier from the changes JSON
    let identifier = '';
    if (log.changes) {
      try {
        const parsed = JSON.parse(log.changes);
        let record = parsed;
        if (parsed.new) record = parsed.new;
        else if (parsed.old) record = parsed.old;
        
        // Try common name fields
        identifier = record.full_name || record.name || record.student_code || record.application_number || '';
      } catch (e) {}
    }

    if (log.description) {
       let desc = log.description;
       
       // Clean up the trigger descriptions to be more human readable
       if (desc.startsWith('Updated record in ')) {
          let table = desc.replace('Updated record in ', '');
          if (table.endsWith('s') && !table.endsWith('ss')) table = table.slice(0, -1);
          desc = `Updated ${table}${identifier && !desc.includes(identifier) ? ` '${identifier}'` : ''}`;
       } else if (desc.startsWith('Created record in ')) {
          let table = desc.replace('Created record in ', '');
          if (table.endsWith('s') && !table.endsWith('ss')) table = table.slice(0, -1);
          desc = `Created ${table}${identifier && !desc.includes(identifier) ? ` '${identifier}'` : ''}`;
       } else if (desc.startsWith('Deleted record in ')) {
          let table = desc.replace('Deleted record in ', '');
          if (table.endsWith('s') && !table.endsWith('ss')) table = table.slice(0, -1);
          desc = `Deleted ${table}${identifier && !desc.includes(identifier) ? ` '${identifier}'` : ''}`;
       }
       
       if (log.url === 'Internal DB Trigger') {
         // Drop the confusing "Internal D B Trigger:" prefix
         return desc;
       }
       
       return `${entity}: ${desc}`;
    }
    
    const id = this.extractIdFromUrl(log.url);
    if (id) return `${entity} #${id}`;
    return this.extractEntityName(log.url);
  }

  getChangesList(jsonString: string | undefined): ChangeItem[] {
    if (!jsonString) return [];
    try {
      const parsed = JSON.parse(jsonString);

      // Check if it's the old format where the first key has an object with .Old and .New properties
      const firstKey = Object.keys(parsed)[0];
      if (firstKey && parsed[firstKey] && (parsed[firstKey].Old !== undefined || parsed[firstKey].New !== undefined || parsed[firstKey].old !== undefined)) {
        // Old format
        const list = Object.keys(parsed).map(key => {
          let productName: string | null = null;
          let fieldName = key;
          if (key.includes(' - ')) {
            const parts = key.split(' - ');
            fieldName = parts.pop() || ''; 
            productName = parts.join(' - '); 
          }
          return {
            fullKey: key,
            productName: productName,
            fieldName: fieldName,
            old: parsed[key].Old !== undefined ? parsed[key].Old : parsed[key].old,
            new: parsed[key].New !== undefined ? parsed[key].New : parsed[key].new
          };
        });
        return list.sort((a, b) => {
          const pA = a.productName || '';
          const pB = b.productName || '';
          return pA.localeCompare(pB) || a.fieldName.localeCompare(b.fieldName);
        });
      }

      // Handle our new PostgreSQL trigger format
      const list: ChangeItem[] = [];

      // UPDATE format
      if (parsed.old !== undefined && parsed.new !== undefined) {
         for (const key in parsed.new) {
            // Filter out noisy audit fields
            if (['updated_at', 'updated_on', 'updated_by', 'created_at', 'created_on', 'created_by', 'deleted_at', 'deleted_on', 'deleted_by', 'id'].includes(key.toLowerCase())) {
              continue;
            }
            
            // Only show fields that actually changed
            if (JSON.stringify(parsed.new[key]) !== JSON.stringify(parsed.old[key])) {
               list.push({
                  fullKey: key,
                  productName: null,
                  fieldName: key,
                  old: parsed.old[key],
                  new: parsed.new[key]
               });
            }
         }
         return list;
      }

      // INSERT or DELETE format (flat object)
      for (const key in parsed) {
         // Filter out noisy audit fields
         if (['updated_at', 'updated_on', 'updated_by', 'created_at', 'created_on', 'created_by', 'deleted_at', 'deleted_on', 'deleted_by', 'id'].includes(key.toLowerCase())) {
           continue;
         }

         list.push({
            fullKey: key,
            productName: null,
            fieldName: key,
            old: null, // For inserts/deletes, we don't display diffs
            new: parsed[key]
         });
      }

      return list;
    } catch (e) {
      return [];
    }
  }

  extractEntityName(url: string): string {
    if (!url) return 'System';
    let clean = url.split('?')[0].replace('/api/', '');
    let entity = clean.split('/')[0]; 
    entity = entity.replace(/([A-Z])/g, ' $1').trim();
    return entity.charAt(0).toUpperCase() + entity.slice(1);
  }

  extractIdFromUrl(url: string): string | null {
    if (!url) return null;
    const clean = url.split('?')[0];
    const parts = clean.split('/');
    const lastPart = parts[parts.length - 1];
    return !isNaN(Number(lastPart)) ? lastPart : null;
  }
}