import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PaginationRequestDto } from 'src/app/common/interfaces/common';
import { environment } from '../environments/environments';

// --- Data Models ---
export interface ServiceRequest {
  id: number;
  ticketCode: string; // SR-1001
  guestName: string;
  guestPhone: string;
  category: string;
  description: string;
  status: string; // Pending, Resolved, Converted, Closed
  isConverted: boolean;
  linkedReplacementInvertNo?: string;
  createdOn: string;
  adminRemarks?: string;
}

export interface ServiceRequestCreateDto {
  tenantId: string;
  guestName: string;
  guestPhone: string;
  category: string;
  description: string;
}

export interface ServiceRequestUpdateDto {
  id: number;
  status: string;
  adminRemarks?: string;
  linkedReplacementInvertNo?: string; // The Bridge ID
}

@Injectable({
  providedIn: 'root'
})
export class ServiceRequestService {
  private apiUrl = `${environment.apiUrl}/ServiceRequests`;

  constructor(private http: HttpClient) { }

  // 1. Admin List
  getServiceRequests(requestDto: PaginationRequestDto): Observable<ApiResponse<ServiceRequest[]>> {
    const params = new HttpParams()
      .set('pageIndex', requestDto.pageIndex.toString())
      .set('pageSize', requestDto.pageSize.toString())
      .set('filter', requestDto.filter || '')
      .set('sortColumn', requestDto.sortColumn || '')
      .set('sortDirection', requestDto.sortDirection || '');
    
    return this.http.get<ApiResponse<ServiceRequest[]>>(this.apiUrl, { params });
  }

  // 2. Public Create (No Auth Header needed if interceptor handles it, otherwise use specific headers)
  createPublicRequest(dto: ServiceRequestCreateDto): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/public/create`, dto);
  }

  // 3. Update Status / Convert
  updateStatus(dto: ServiceRequestUpdateDto): Observable<ApiResponse<object>> {
    return this.http.put<ApiResponse<object>>(`${this.apiUrl}/update-status`, dto);
  }

  getPublicCompanyInfo(encryptedTenantId: string): Observable<ApiResponse<any>> {
  // Pass the encrypted ID as a query parameter
  return this.http.get<ApiResponse<any>>(`${this.apiUrl}/public/company-info`, {
    params: new HttpParams().set('tenantId', encryptedTenantId)
  });
}
}