import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';
import { environment } from '../environments/environments';

export interface UserActivity {
  id: number;
  userId: string;
  userName?: string;
  url: string;
  method: string;
  ipAddress: string;
  createdOn: Date;
  description?: string;
  changes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserActivityService {
  private apiUrl = `${environment.apiUrl}/UserActivity`;

  constructor(private http: HttpClient) {}

  getRecentActivity(request: PaginationRequestDto): Observable<ApiResponse<UserActivity[]>> {
    const params = new HttpParams()
      .set('pageIndex', request.pageIndex.toString())
      .set('pageSize', request.pageSize.toString());
      
    return this.http.get<ApiResponse<UserActivity[]>>(`${this.apiUrl}/recent`, { params: params });
  }

  getEntityActivity(id: string, request: PaginationRequestDto): Observable<ApiResponse<UserActivity[]>> {
    const params = new HttpParams()
      .set('pageIndex', request.pageIndex.toString())
      .set('pageSize', request.pageSize.toString());
      
    return this.http.get<ApiResponse<UserActivity[]>>(`${this.apiUrl}/entity/${id}`, { params: params });
  }
}