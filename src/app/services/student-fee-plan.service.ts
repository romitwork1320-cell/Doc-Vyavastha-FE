import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse } from '../common/interfaces/common';
import { StudentFeePlan } from '../models/fee.models';

@Injectable({
  providedIn: 'root'
})
export class StudentFeePlanService {
  private baseUrl = `${environment.apiUrl}/StudentFeePlans`;

  constructor(private http: HttpClient) {}

  getAll(studentId?: string): Observable<ApiResponse<StudentFeePlan[]>> {
    const url = studentId ? `${this.baseUrl}/student/${studentId}` : this.baseUrl;
    return this.http.get<ApiResponse<StudentFeePlan[]>>(url);
  }

  getById(id: string): Observable<ApiResponse<StudentFeePlan>> {
    return this.http.get<ApiResponse<StudentFeePlan>>(`${this.baseUrl}/${id}`);
  }

  create(item: StudentFeePlan): Observable<ApiResponse<StudentFeePlan>> {
    return this.http.post<ApiResponse<StudentFeePlan>>(this.baseUrl, item);
  }

  update(id: string, item: Partial<StudentFeePlan>): Observable<ApiResponse<StudentFeePlan>> {
    return this.http.put<ApiResponse<StudentFeePlan>>(`${this.baseUrl}/${id}`, item);
  }

  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}
