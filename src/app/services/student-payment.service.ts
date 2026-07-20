import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse } from '../common/interfaces/common';
import { StudentPayment } from '../models/fee.models';

@Injectable({
  providedIn: 'root'
})
export class StudentPaymentService {
  private baseUrl = `${environment.apiUrl}/StudentPayments`;

  constructor(private http: HttpClient) {}

  getAll(studentId?: string, feePlanId?: string): Observable<ApiResponse<StudentPayment[]>> {
    let url = this.baseUrl;
    if (studentId) {
      url = `${this.baseUrl}/student/${studentId}`;
    } else if (feePlanId) {
      url = `${this.baseUrl}/fee-plan/${feePlanId}`;
    }
    return this.http.get<ApiResponse<StudentPayment[]>>(url);
  }

  getById(id: string): Observable<ApiResponse<StudentPayment>> {
    return this.http.get<ApiResponse<StudentPayment>>(`${this.baseUrl}/${id}`);
  }

  create(item: StudentPayment): Observable<ApiResponse<StudentPayment>> {
    return this.http.post<ApiResponse<StudentPayment>>(this.baseUrl, item);
  }

  update(id: string, item: Partial<StudentPayment>): Observable<ApiResponse<StudentPayment>> {
    return this.http.put<ApiResponse<StudentPayment>>(`${this.baseUrl}/${id}`, item);
  }

  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}
