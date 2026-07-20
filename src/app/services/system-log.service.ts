import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';

export interface SystemLog {
  logId: number;
  logDate: Date;
  logLevel: string;
  source: string;
  message: string;
  stackTrace?: string; 
  tenantName?: string;
  userId?: string;
  requestUrl?: string;
  ipAddress?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SystemLogService {
  // Ensure your environment.apiUrl is correct (e.g., https://localhost:7000/api)
  private apiUrl = `${environment.apiUrl}/SystemLog`;

  constructor(private http: HttpClient) {}

  getAllLogs(request: PaginationRequestDto): Observable<ApiResponse<SystemLog[]>> {
    return this.http.post<ApiResponse<SystemLog[]>>(`${this.apiUrl}/get-all`, request);
  }

  getLogById(id: number): Observable<ApiResponse<SystemLog>> {
    return this.http.get<ApiResponse<SystemLog>>(`${this.apiUrl}/${id}`);
  }

  deleteLog(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  cleanupLogs(days: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/cleanup/${days}`);
  }
}