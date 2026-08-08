import { Injectable } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environments';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
  totalRecords?: number;
  totalCount?: number;
}

export interface ActivityRecord {
  description: string;
  createdOn: string;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface DashboardData {
  workspaceName: string;
  
  // Organization KPIs
  totalClients?: number;
  openApplications?: number;
  inProgressApplications?: number;
  completedApplications?: number;
  
  // Chart Data (Org)
  applicationsByStatus?: StatusCount[];
  
  // Client KPIs
  pendingDocumentRequests?: number;
  connectedOrganizations?: number;
  pendingApps?: number;
  completedApps?: number;
  
  // Shared
  recentActivity: ActivityRecord[];
}

export interface StatusCountsDto {
  groupStatus: string;
  totalCount: number;
}

export interface RequiresActionDto {
  id: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard`;
  
  // Expose activityUpdated$ so existing components compile
  private activityUpdatedSource = new Subject<void>();
  activityUpdated$ = this.activityUpdatedSource.asObservable();

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<ApiResponse<DashboardData>> {
    return this.http.get<ApiResponse<DashboardData>>(`${this.apiUrl}`);
  }

  notifyActivityUpdate() {
    this.activityUpdatedSource.next();
  }

  getStatusCounts(): Observable<ApiResponse<StatusCountsDto[]>> {
    return of({ success: true, message: '', data: [], statusCode: 200 });
  }

  getRequiresActionAlerts(filter: any = null): Observable<ApiResponse<RequiresActionDto[]>> {
    return of({ success: true, message: '', data: [], statusCode: 200 });
  }
}