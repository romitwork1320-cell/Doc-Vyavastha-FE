import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';
import { StudentCaste } from '../models/student.models';

@Injectable({
  providedIn: 'root'
})
export class StudentCasteService {
  private apiUrl = `${environment.apiUrl}/StudentCastes`;

  constructor(private http: HttpClient) {}

  getAll(pagination: PaginationRequestDto): Observable<ApiResponse<StudentCaste[]>> {
    let params = new HttpParams()
      .set('pageIndex', pagination.pageIndex.toString())
      .set('pageSize', pagination.pageSize.toString());
      
    if (pagination.filter) {
      params = params.set('filter', pagination.filter);
    }

    return this.http.get<ApiResponse<StudentCaste[]>>(this.apiUrl, { params });
  }

  getById(id: string): Observable<ApiResponse<StudentCaste>> {
    return this.http.get<ApiResponse<StudentCaste>>(`${this.apiUrl}/${id}`);
  }

  create(data: any): Observable<ApiResponse<StudentCaste>> {
    return this.http.post<ApiResponse<StudentCaste>>(this.apiUrl, data);
  }

  update(id: string, data: any): Observable<ApiResponse<StudentCaste>> {
    return this.http.put<ApiResponse<StudentCaste>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }
}
