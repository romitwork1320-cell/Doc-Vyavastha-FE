import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import { LeadService, CrmLead } from '../../services/lead.service';
import { DealService, CrmDeal } from '../../services/deal.service';
import { ActivityService, CrmActivity } from '../../services/activity.service';
import { ContactService, Contact } from '../../services/contacts.service';
import { forkJoin, Subject, takeUntil, distinctUntilChanged } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-starter',
  standalone: true,
  imports: [CommonModule, RouterModule, TablerIconsModule, CurrencyPipe],
  template: `
    <div class="crm-dashboard">

      <!-- Welcome Banner -->
      <div class="welcome-banner">
        <div class="welcome-text">
          <h1>Good evening 👋</h1>
          <p>Here's what's happening with your sales pipeline today.</p>
        </div>
        <div class="welcome-actions">
          <a routerLink="/leads" class="btn-primary">
            <i-tabler name="plus" style="width:16px;height:16px"></i-tabler>
            Add Lead
          </a>
          <a routerLink="/pipeline" class="btn-outline">
            <i-tabler name="git-branch" style="width:16px;height:16px"></i-tabler>
            View Pipeline
          </a>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid" *ngIf="!isLoading">
        <div class="kpi-card kpi-leads">
          <div class="kpi-icon"><i-tabler name="target" style="width:24px;height:24px"></i-tabler></div>
          <div class="kpi-body">
            <div class="kpi-value">{{ totalLeads }}</div>
            <div class="kpi-label">Total Leads</div>
            <div class="kpi-sub">{{ newLeads }} new this week</div>
          </div>
        </div>
        <div class="kpi-card kpi-pipeline">
          <div class="kpi-icon"><i-tabler name="currency-rupee" style="width:24px;height:24px"></i-tabler></div>
          <div class="kpi-body">
            <div class="kpi-value">{{ pipelineValue | currency:'INR':'symbol':'1.0-0' }}</div>
            <div class="kpi-label">Pipeline Value</div>
            <div class="kpi-sub">{{ openDeals }} open deals</div>
          </div>
        </div>
        <div class="kpi-card kpi-won">
          <div class="kpi-icon"><i-tabler name="trophy" style="width:24px;height:24px"></i-tabler></div>
          <div class="kpi-body">
            <div class="kpi-value">{{ closedWonValue | currency:'INR':'symbol':'1.0-0' }}</div>
            <div class="kpi-label">Closed Won</div>
            <div class="kpi-sub">{{ wonDeals }} deals won</div>
          </div>
        </div>
        <div class="kpi-card kpi-contacts">
          <div class="kpi-icon"><i-tabler name="users" style="width:24px;height:24px"></i-tabler></div>
          <div class="kpi-body">
            <div class="kpi-value">{{ totalContacts }}</div>
            <div class="kpi-label">Total Contacts</div>
            <div class="kpi-sub">{{ conversionRate }}% conv. rate</div>
          </div>
        </div>
        <div class="kpi-card kpi-activities">
          <div class="kpi-icon"><i-tabler name="calendar-event" style="width:24px;height:24px"></i-tabler></div>
          <div class="kpi-body">
            <div class="kpi-value">{{ totalActivities }}</div>
            <div class="kpi-label">Activities</div>
            <div class="kpi-sub overdue" *ngIf="overdueActivities > 0">{{ overdueActivities }} overdue</div>
          </div>
        </div>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <p>Loading Dashboard Data...</p>
      </div>

      <!-- Main Content Grid -->
      <div class="content-grid" *ngIf="!isLoading">

        <!-- Pipeline by Stage -->
        <div class="card pipeline-card">
          <div class="card-header">
            <h3>Pipeline by Stage</h3>
            <a routerLink="/pipeline" class="card-link">View Board →</a>
          </div>
          <div class="stage-bars">
            <div *ngFor="let s of dealsByStage" class="stage-bar-row">
              <div class="stage-name">{{ s.stage }}</div>
              <div class="stage-bar-track">
                <div class="stage-bar-fill" [style.width.%]="pipelineValue > 0 ? (s.value / pipelineValue) * 100 : 0"
                     [style.background]="s.color"></div>
              </div>
              <div class="stage-value">{{ s.value | currency:'INR':'symbol':'1.0-0' }}</div>
              <div class="stage-count">{{ s.count }} deals</div>
            </div>
            <div *ngIf="dealsByStage.length === 0" class="empty-state">No open deals found.</div>
          </div>
        </div>

        <!-- Recent Leads -->
        <div class="card leads-card">
          <div class="card-header">
            <h3>Recent Leads</h3>
            <a routerLink="/leads" class="card-link">View All →</a>
          </div>
          <div class="leads-list">
            <div *ngFor="let lead of recentLeads" class="lead-row">
              <div class="lead-avatar" [style.background]="getAvatarColor(lead.contact)">
                {{ lead.contact ? lead.contact[0] : 'U' }}
              </div>
              <div class="lead-info">
                <div class="lead-title">{{ lead.title }}</div>
                <div class="lead-company">{{ lead.company }}</div>
              </div>
              <div class="lead-meta">
                <span class="status-badge" [class]="'status-' + lead.status.toLowerCase()">{{ lead.status }}</span>
                <div class="lead-value">{{ lead.value | currency:'INR':'symbol':'1.0-0' }}</div>
              </div>
            </div>
            <div *ngIf="recentLeads.length === 0" class="empty-state">No leads found.</div>
          </div>
        </div>

        <!-- Activities -->
        <div class="card activity-card">
          <div class="card-header">
            <h3>Upcoming Activities</h3>
            <a routerLink="/activities" class="card-link">View All →</a>
          </div>
          <div class="activity-list">
            <div *ngFor="let act of pendingActivities" class="activity-row">
              <div class="act-icon" [style.background]="(actColors[act.type] || '#6366f1') + '20'" [style.color]="actColors[act.type] || '#6366f1'">
                <i-tabler [name]="actIcons[act.type] || 'calendar'" style="width:16px;height:16px"></i-tabler>
              </div>
              <div class="act-info">
                <div class="act-subject">{{ act.subject }}</div>
                <div class="act-meta">{{ act.assignedTo }} · {{ act.linkedTo }}</div>
              </div>
              <div class="act-right">
                <div class="act-due" [class.overdue]="isOverdue(act.dueDate)">{{ formatDate(act.dueDate) }}</div>
                <span class="priority-badge" [class]="'priority-' + act.priority.toLowerCase()">{{ act.priority }}</span>
              </div>
            </div>
            <div *ngIf="pendingActivities.length === 0" class="empty-state">No pending activities.</div>
          </div>
        </div>

        <!-- Leads by Source -->
        <div class="card source-card">
          <div class="card-header"><h3>Leads by Source</h3></div>
          <div class="source-list">
            <div *ngFor="let s of leadsBySource" class="source-row">
              <div class="source-dot" [style.background]="getSourceColor(s.source)"></div>
              <div class="source-name">{{ s.source }}</div>
              <div class="source-bar-track">
                <div class="source-bar-fill"
                     [style.width.%]="totalLeads > 0 ? (s.count / totalLeads) * 100 : 0"
                     [style.background]="getSourceColor(s.source)"></div>
              </div>
              <div class="source-count">{{ s.count }}</div>
            </div>
            <div *ngIf="leadsBySource.length === 0" class="empty-state">No sources found.</div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .crm-dashboard { padding: 0; }
    
    .loading-state { padding: 40px; text-align: center; color: #64748b; font-weight: 500; font-size: 15px; }

    /* Welcome */
    .welcome-banner {
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-radius: 16px; padding: 28px 32px; margin-bottom: 24px; color: #fff;
    }
    .welcome-text h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
    .welcome-text p { margin: 0; opacity: 0.85; font-size: 14px; }
    .welcome-actions { display: flex; gap: 10px; }
    .btn-primary {
      display: flex; align-items: center; gap: 6px; padding: 10px 18px;
      background: #fff; color: #6366f1; border-radius: 8px; font-weight: 600;
      font-size: 14px; text-decoration: none; transition: all 0.2s;
    }
    .btn-primary:hover { background: #f1f0ff; transform: translateY(-1px); }
    .btn-outline {
      display: flex; align-items: center; gap: 6px; padding: 10px 18px;
      background: rgba(255,255,255,0.15); color: #fff; border-radius: 8px;
      font-weight: 600; font-size: 14px; text-decoration: none;
      border: 1px solid rgba(255,255,255,0.4); transition: all 0.2s;
    }
    .btn-outline:hover { background: rgba(255,255,255,0.25); }

    /* KPI Grid */
    .kpi-grid {
      display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 24px;
    }
    .kpi-card {
      background: #fff; border-radius: 14px; padding: 20px; display: flex;
      align-items: flex-start; gap: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.07);
      border: 1px solid #f1f5f9; position: relative; overflow: hidden; transition: all 0.2s;
    }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .kpi-icon {
      width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0;
    }
    .kpi-leads .kpi-icon { background: #eef2ff; color: #6366f1; }
    .kpi-pipeline .kpi-icon { background: #fef3c7; color: #d97706; }
    .kpi-won .kpi-icon { background: #dcfce7; color: #16a34a; }
    .kpi-contacts .kpi-icon { background: #fce7f3; color: #db2777; }
    .kpi-activities .kpi-icon { background: #e0f2fe; color: #0284c7; }
    .kpi-body { flex: 1; min-width: 0; }
    .kpi-value { font-size: 24px; font-weight: 700; color: #0f172a; line-height: 1.2; }
    .kpi-label { font-size: 13px; color: #64748b; margin: 2px 0; }
    .kpi-sub { font-size: 12px; color: #94a3b8; }
    .kpi-sub.overdue { color: #ef4444; font-weight: 500; }

    /* Cards */
    .content-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
    }
    .card {
      background: #fff; border-radius: 14px; padding: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.07); border: 1px solid #f1f5f9;
      display: flex; flex-direction: column; min-height: 280px;
    }
    .card-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
    }
    .card-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: #0f172a; }
    .card-link { font-size: 13px; color: #6366f1; text-decoration: none; font-weight: 500; }
    .card-link:hover { text-decoration: underline; }

    .empty-state {
      flex: 1; display: flex; align-items: center; justify-content: center;
      color: #94a3b8; font-size: 13px; text-align: center; padding: 20px;
    }

    /* Pipeline Stage Bars */
    .stage-bars { display: flex; flex-direction: column; gap: 12px; }
    .stage-bar-row { display: grid; grid-template-columns: 130px 1fr 60px 60px; align-items: center; gap: 10px; }
    .stage-name { font-size: 13px; color: #475569; font-weight: 500; }
    .stage-bar-track { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
    .stage-bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
    .stage-value { font-size: 13px; font-weight: 600; color: #0f172a; text-align: right; }
    .stage-count { font-size: 12px; color: #94a3b8; text-align: right; }

    /* Leads List */
    .leads-list { display: flex; flex-direction: column; gap: 10px; }
    .lead-row {
      display: flex; align-items: center; gap: 12px; padding: 10px;
      border-radius: 8px; background: #f8fafc; transition: background 0.15s;
    }
    .lead-row:hover { background: #f1f5f9; }
    .lead-avatar {
      width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center;
      justify-content: center; color: #fff; font-weight: 700; font-size: 14px; flex-shrink: 0;
    }
    .lead-info { flex: 1; min-width: 0; }
    .lead-title { font-size: 13px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .lead-company { font-size: 12px; color: #64748b; }
    .lead-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
    .lead-value { font-size: 13px; font-weight: 600; color: #0f172a; }
    .status-badge { font-size: 11px; padding: 2px 8px; border-radius: 20px; font-weight: 500; }
    .status-new { background: #dbeafe; color: #1d4ed8; }
    .status-contacted { background: #fef3c7; color: #92400e; }
    .status-qualified { background: #dcfce7; color: #166534; }
    .status-unqualified { background: #fee2e2; color: #991b1b; }
    .status-converted { background: #ede9fe; color: #5b21b6; }

    /* Activities */
    .activity-list { display: flex; flex-direction: column; gap: 10px; }
    .activity-row {
      display: flex; align-items: center; gap: 12px; padding: 10px;
      border-radius: 8px; background: #f8fafc; transition: background 0.15s;
    }
    .activity-row:hover { background: #f1f5f9; }
    .act-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .act-info { flex: 1; min-width: 0; }
    .act-subject { font-size: 13px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .act-meta { font-size: 12px; color: #64748b; }
    .act-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
    .act-due { font-size: 11px; color: #64748b; }
    .act-due.overdue { color: #ef4444; font-weight: 600; }
    .priority-badge { font-size: 11px; padding: 2px 7px; border-radius: 20px; font-weight: 500; text-transform: capitalize; }
    .priority-high { background: #fee2e2; color: #991b1b; }
    .priority-medium { background: #fef3c7; color: #92400e; }
    .priority-low { background: #f0fdf4; color: #166534; }

    /* Source */
    .source-list { display: flex; flex-direction: column; gap: 12px; }
    .source-row { display: grid; grid-template-columns: 10px 100px 1fr 30px; align-items: center; gap: 10px; }
    .source-dot { width: 10px; height: 10px; border-radius: 50%; }
    .source-name { font-size: 13px; color: #475569; }
    .source-bar-track { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
    .source-bar-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
    .source-count { font-size: 13px; font-weight: 600; color: #0f172a; text-align: right; }

    @media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 900px) { .content-grid { grid-template-columns: 1fr; } }
    @media (max-width: 600px) { .kpi-grid { grid-template-columns: 1fr 1fr; } }
  `]
})
export class StarterComponent implements OnInit {
  private leadService = inject(LeadService);
  private dealService = inject(DealService);
  private activityService = inject(ActivityService);
  private contactService = inject(ContactService);

  isLoading = true;

  // KPI Metrics
  totalLeads = 0;
  newLeads = 0;
  pipelineValue = 0;
  openDeals = 0;
  closedWonValue = 0;
  wonDeals = 0;
  totalContacts = 0;
  conversionRate = 0;
  totalActivities = 0;
  overdueActivities = 0;

  // Chart Data
  dealsByStage: { stage: string, color: string, value: number, count: number }[] = [];
  leadsBySource: { source: string, count: number }[] = [];
  recentLeads: CrmLead[] = [];
  pendingActivities: CrmActivity[] = [];

  // Metadata / Lookup
  actIcons: Record<string, string> = {
    'Call': 'phone', 'Meeting': 'calendar', 'Email': 'mail',
    'Task': 'checkbox', 'Note': 'notes',
  };

  actColors: Record<string, string> = {
    'Call': '#6366f1', 'Meeting': '#8b5cf6', 'Email': '#f59e0b',
    'Task': '#0284c7', 'Note': '#64748b',
  };

  sourceColors = ['#6366f1','#8b5cf6','#f59e0b','#22c55e','#f97316','#0284c7'];
  private destroy$ = new Subject<void>();
  private authService = inject(AuthService);

  ngOnInit() {
    this.authService.activeBranchId$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged()
    ).subscribe(branchId => {
      if (branchId) {
        this.loadDashboardData();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData() {
    this.isLoading = true;

    forkJoin({
      leadsResponse: this.leadService.getLeads(0, 1000),
      dealsResponse: this.dealService.getPipeline(),
      activitiesResponse: this.activityService.getActivities(0, 1000),
      contactsResponse: this.contactService.getContacts({ pageIndex: 0, pageSize: 1000 })
    }).subscribe({
      next: (results) => {
        // --- LEADS ---
        const leads = results.leadsResponse?.data || [];
        this.totalLeads = leads.length;
        this.recentLeads = [...leads].sort((a, b) => new Date(b.createdOn || 0).getTime() - new Date(a.createdOn || 0).getTime()).slice(0, 5);
        
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        this.newLeads = leads.filter(l => new Date(l.createdOn || 0) >= oneWeekAgo).length;

        // Group Leads by Source
        const sourcesMap = new Map<string, number>();
        leads.forEach(l => {
          const s = l.source || 'Other';
          sourcesMap.set(s, (sourcesMap.get(s) || 0) + 1);
        });
        this.leadsBySource = Array.from(sourcesMap.entries())
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count);

        // --- DEALS ---
        const pipelineStages = results.dealsResponse?.data || [];
        this.pipelineValue = 0;
        this.openDeals = 0;
        this.closedWonValue = 0;
        this.wonDeals = 0;
        this.dealsByStage = [];

        pipelineStages.forEach(stage => {
          let stageValue = 0;
          let stageCount = 0;

          (stage.deals || []).forEach(deal => {
            if (deal.status === 'Open') {
              this.pipelineValue += (deal.value || 0);
              this.openDeals++;
              stageValue += (deal.value || 0);
              stageCount++;
            } else if (deal.status === 'Won') {
              this.closedWonValue += (deal.value || 0);
              this.wonDeals++;
            }
          });

          if (stageCount > 0) {
            this.dealsByStage.push({
              stage: stage.name,
              color: stage.color || '#6366F1',
              value: stageValue,
              count: stageCount
            });
          }
        });

        // Conversion Rate
        if (this.totalLeads > 0) {
          this.conversionRate = Math.round((this.wonDeals / this.totalLeads) * 100);
        }

        // --- CONTACTS ---
        const contacts = results.contactsResponse?.data || [];
        this.totalContacts = contacts.length;

        // --- ACTIVITIES ---
        const activities = results.activitiesResponse?.data || [];
        this.totalActivities = activities.length;
        
        const now = new Date();
        this.overdueActivities = activities.filter((a: any) => 
          a.status !== 'Completed' && new Date(a.dueDate) < now
        ).length;

        this.pendingActivities = activities
          .filter((a: any) => a.status === 'Pending')
          .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5);

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load dashboard data', err);
        this.isLoading = false;
      }
    });
  }

  getSourceColor(source: string): string {
    const idx = this.leadsBySource.findIndex(s => s.source === source);
    return this.sourceColors[idx % this.sourceColors.length] || '#64748b';
  }

  getAvatarColor(name: string): string {
    if (!name) return '#6366f1';
    const colors = ['#6366f1','#8b5cf6','#f59e0b','#22c55e','#f97316','#0284c7','#db2777','#dc2626'];
    let hash = 0;
    for (let c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
    return colors[hash % colors.length];
  }

  isOverdue(date: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  formatDate(date: string): string {
    if (!date) return '';
    try {
      const d = new Date(date);
      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    } catch {
      return date.split('T')[0];
    }
  }
}