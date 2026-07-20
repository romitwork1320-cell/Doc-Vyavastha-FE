import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';
import { ApplicationStatus } from '../models/student.models';
import { buildPageParams } from './student.service';

@Injectable({
  providedIn: 'root'
})
export class ApplicationStatusService {
  private baseUrl = `${environment.apiUrl}/ApplicationStatuses`;

  constructor(private http: HttpClient) {}

  getAll(requestDto?: PaginationRequestDto): Observable<ApiResponse<ApplicationStatus[]>> {
    return this.http.get<ApiResponse<ApplicationStatus[]>>(this.baseUrl, { params: buildPageParams(requestDto) });
  }

  getById(id: string): Observable<ApiResponse<ApplicationStatus>> {
    return this.http.get<ApiResponse<ApplicationStatus>>(`${this.baseUrl}/${id}`);
  }

  create(item: ApplicationStatus): Observable<ApiResponse<ApplicationStatus>> {
    return this.http.post<ApiResponse<ApplicationStatus>>(this.baseUrl, item);
  }

  update(id: string, item: Partial<ApplicationStatus>): Observable<ApiResponse<ApplicationStatus>> {
    return this.http.put<ApiResponse<ApplicationStatus>>(`${this.baseUrl}/${id}`, item);
  }

  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}
