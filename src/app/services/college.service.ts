import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';
import { College } from '../models/student.models';
import { buildPageParams } from './student.service';

@Injectable({
  providedIn: 'root'
})
export class CollegeService {
  private baseUrl = `${environment.apiUrl}/Colleges`;

  constructor(private http: HttpClient) {}

  getAll(requestDto?: PaginationRequestDto): Observable<ApiResponse<College[]>> {
    return this.http.get<ApiResponse<College[]>>(this.baseUrl, { params: buildPageParams(requestDto) });
  }

  getById(id: string): Observable<ApiResponse<College>> {
    return this.http.get<ApiResponse<College>>(`${this.baseUrl}/${id}`);
  }

  create(item: Partial<College>): Observable<ApiResponse<College>> {
    return this.http.post<ApiResponse<College>>(this.baseUrl, item);
  }

  update(id: string, item: Partial<College>): Observable<ApiResponse<College>> {
    return this.http.put<ApiResponse<College>>(`${this.baseUrl}/${id}`, item);
  }

  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}
