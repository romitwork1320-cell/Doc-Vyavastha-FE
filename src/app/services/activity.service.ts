import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environments';
import { Observable } from 'rxjs';

export interface CrmActivity {
  id: number;
  type: string;
  subject: string;
  linkedTo?: string;
  linkedType?: string;
  dealId?: number;
  assignedTo?: string;
  dueDate: string;
  status: 'Pending' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  description?: string;
  isActive: boolean;
  createdOn: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Activities`;

  getActivities(pageIndex = 0, pageSize = 50): Observable<any> {
    return this.http.get(`${this.apiUrl}?pageIndex=${pageIndex}&pageSize=${pageSize}`);
  }

  getActivitiesByDeal(dealId: number): Observable<{ data: CrmActivity[], isSuccess: boolean }> {
    return this.http.get<{ data: CrmActivity[], isSuccess: boolean }>(`${this.apiUrl}/deal/${dealId}`);
  }

  createActivity(activity: Partial<CrmActivity>): Observable<any> {
    return this.http.post(this.apiUrl, activity);
  }

  updateActivity(id: number, activity: Partial<CrmActivity>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, activity);
  }

  deleteActivity(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
