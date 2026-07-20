import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface DashboardKpis {
  totalStudents: number;
  studentGrowthPct: number;
  newStudentsThisMonth: number;
  totalApplications: number;
  pendingApplications: number;
  totalFeePlanned: number;
  totalFeeCollected: number;
  pendingFeeCollection: number;
  upcomingDeadlines: number;
}

export interface ChartSeriesData {
  name: string;
  data: number[];
}

export interface StudentAnalytics {
  distributionByCategory: { category: string; count: number }[];
  admissionTrend: { month: string; count: number }[];
}

export interface ApplicationAnalytics {
  statusDistribution: { status: string; count: number }[];
  typesDistribution: { type: string; count: number }[];
}

export interface RevenueAnalytics {
  totalPlanned: number;
  totalDiscounts: number;
  netRevenue: number;
  totalCollected: number;
  totalPending: number;
  collectionTrend: { month: string; amount: number }[];
  paymentMethodDistribution: { method: string; amount: number }[];
}

export interface ActionItem {
  id: string;
  studentCode: string;
  studentName: string;
  issue: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
}

export interface DeadlineItem {
  id: string;
  studentCode: string;
  studentName: string;
  application: string;
  deadlineDate: string; // ISO date string
  remainingDays: number;
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  timestamp: string; // ISO date string
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../environments/environments';

@Injectable({ providedIn: 'root' })
export class ErpDashboardService {
  private apiUrl = `${environment.apiUrl}/Dashboard`;

  constructor(private http: HttpClient) {}

  private getParams(fromDate?: string, toDate?: string): HttpParams {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return params;
  }

  getKpis(fromDate?: string, toDate?: string): Observable<ApiResponse<DashboardKpis>> {
    return this.http.get<ApiResponse<DashboardKpis>>(`${this.apiUrl}/kpis`, { params: this.getParams(fromDate, toDate) });
  }

  getStudentAnalytics(fromDate?: string, toDate?: string): Observable<ApiResponse<StudentAnalytics>> {
    return this.http.get<ApiResponse<StudentAnalytics>>(`${this.apiUrl}/student-analytics`, { params: this.getParams(fromDate, toDate) });
  }

  getApplicationAnalytics(fromDate?: string, toDate?: string): Observable<ApiResponse<ApplicationAnalytics>> {
    return this.http.get<ApiResponse<ApplicationAnalytics>>(`${this.apiUrl}/application-analytics`, { params: this.getParams(fromDate, toDate) });
  }

  getRevenueAnalytics(fromDate?: string, toDate?: string): Observable<ApiResponse<RevenueAnalytics>> {
    return this.http.get<ApiResponse<RevenueAnalytics>>(`${this.apiUrl}/revenue-analytics`, { params: this.getParams(fromDate, toDate) });
  }

  getActionCenter(fromDate?: string, toDate?: string): Observable<ApiResponse<ActionItem[]>> {
    return this.http.get<ApiResponse<ActionItem[]>>(`${this.apiUrl}/action-center`, { params: this.getParams(fromDate, toDate) });
  }

  getUpcomingDeadlines(fromDate?: string, toDate?: string): Observable<ApiResponse<DeadlineItem[]>> {
    return this.http.get<ApiResponse<DeadlineItem[]>>(`${this.apiUrl}/upcoming-deadlines`, { params: this.getParams(fromDate, toDate) });
  }

  getRecentActivity(fromDate?: string, toDate?: string): Observable<ApiResponse<ActivityItem[]>> {
    return this.http.get<ApiResponse<ActivityItem[]>>(`${this.apiUrl}/recent-activity`, { params: this.getParams(fromDate, toDate) });
  }
}
