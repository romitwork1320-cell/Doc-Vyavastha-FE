import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environments';
import { ApiResponse } from './dashboard.service';

export interface KycStatusResponse {
  status: string;
  rejectionReason: string;
}

@Injectable({ providedIn: 'root' })
export class KycService {
  private apiUrl = `${environment.apiUrl}/kyc`;

  constructor(private http: HttpClient) {}

  getStatus(): Observable<ApiResponse<KycStatusResponse>> {
    return this.http.get<ApiResponse<KycStatusResponse>>(`${this.apiUrl}/status`);
  }

  uploadDocuments(formData: FormData): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/upload`, formData);
  }
}
