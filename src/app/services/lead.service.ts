import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environments';
import { Observable } from 'rxjs';

export interface CrmLead {
  id: number;
  title: string;
  contact: string;
  company?: string;
  email?: string;
  phone?: string;
  status: string; // New | Contacted | Qualified | Unqualified | Converted
  source?: string;
  value: number;
  priority: string; // High | Medium | Low
  assignedTo?: string;
  expectedClose?: string;
  tags?: string;
  isActive: boolean;
  createdOn: string;
}

export interface PaginatedResult<T> {
  data: T;
  totalRecords: number;
  isSuccess: boolean;
  message: string;
  statusCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Leads`;

  getLeads(pageIndex = 0, pageSize = 15, filter?: string, sortColumn?: string, sortDirection?: string): Observable<PaginatedResult<CrmLead[]>> {
    let url = `${this.apiUrl}?pageIndex=${pageIndex}&pageSize=${pageSize}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    if (sortColumn) url += `&sortColumn=${sortColumn}`;
    if (sortDirection) url += `&sortDirection=${sortDirection}`;
    return this.http.get<PaginatedResult<CrmLead[]>>(url);
  }

  getLeadById(id: number): Observable<{ data: CrmLead, isSuccess: boolean }> {
    return this.http.get<{ data: CrmLead, isSuccess: boolean }>(`${this.apiUrl}/${id}`);
  }

  createLead(lead: Partial<CrmLead>): Observable<any> {
    return this.http.post(this.apiUrl, lead);
  }

  updateLead(id: number, lead: Partial<CrmLead>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, lead);
  }

  deleteLead(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  convertToDeal(id: number, stage: string = 'Lead'): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/convert?stage=${encodeURIComponent(stage)}`, {});
  }
}
