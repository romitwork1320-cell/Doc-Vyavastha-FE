import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environments';
import { ApiResponse } from './dashboard.service';

export interface Organization {
  tenant_id: number;
  tenant_name: string;
  company_name: string;
  contact_email: string;
  contact_phone: string;
  org_type: string;
  kyc_status: string;
  is_active: boolean;
  TenantID?: number; // Keep for backwards compatibility with any existing usages
  CompanyName?: string;
  ContactEmail?: string;
  ContactPhone?: string;
  OrgType?: string;
  KycStatus?: string;
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private apiUrl = `${environment.apiUrl}/super-admin/organizations`;

  constructor(private http: HttpClient) {}

  getOrganizations(): Observable<ApiResponse<Organization[]>> {
    return this.http.get<ApiResponse<Organization[]>>(`${this.apiUrl}`);
  }

  approveOrganization(id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectOrganization(id: number, reason: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${id}/reject`, { reason });
  }
}
