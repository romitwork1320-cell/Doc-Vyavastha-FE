import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/app/environments/environments';
import { ApiResponse } from '../common/interfaces/common';

export interface ApplicationFeeCollectionDto {
  id: string;
  applicationId: string;
  applicationName: string;
  studentId: string;
  studentName: string;
  staffId: string;
  staffName: string;
  collegeFeeAmount: number;
  paymentToCollegeMethod: string;
  studentReimbursementMethod: string;
  studentTransactionRef?: string;
  staffRemarks?: string;
  adminVerificationStatus: string;
  adminRemarks?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface CreateCollectionDto {
  applicationId: string;
  collegeFeeAmount: number;
  paymentToCollegeMethod: string;
  studentReimbursementMethod: string;
  studentTransactionRef?: string;
  staffRemarks?: string;
}

export interface UpdateCollectionStatusDto {
  status: string;
  remarks?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationFeeCollectionService {
  private apiUrl = `${environment.apiUrl}/FormFeeCollections`;
  private http = inject(HttpClient);

  constructor() { }

  listCollections(filters?: { staffId?: string, status?: string, startDate?: string, endDate?: string }): Observable<ApiResponse<ApplicationFeeCollectionDto[]>> {
    let params = new HttpParams();
    if (filters?.staffId) params = params.set('staffId', filters.staffId);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);

    return this.http.get<ApiResponse<ApplicationFeeCollectionDto[]>>(this.apiUrl, { params });
  }

  createCollection(data: CreateCollectionDto): Observable<ApiResponse<ApplicationFeeCollectionDto>> {
    return this.http.post<ApiResponse<ApplicationFeeCollectionDto>>(this.apiUrl, data);
  }

  updateCollection(id: string, data: CreateCollectionDto): Observable<ApiResponse<ApplicationFeeCollectionDto>> {
    return this.http.put<ApiResponse<ApplicationFeeCollectionDto>>(`${this.apiUrl}/${id}`, data);
  }

  updateStatus(id: string, data: UpdateCollectionStatusDto): Observable<ApiResponse<ApplicationFeeCollectionDto>> {
    return this.http.patch<ApiResponse<ApplicationFeeCollectionDto>>(`${this.apiUrl}/${id}/status`, data);
  }
}
