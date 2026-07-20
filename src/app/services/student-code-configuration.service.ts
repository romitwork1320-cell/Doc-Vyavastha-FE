import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';
import { StudentCodeConfiguration } from '../models/student.models';
import { buildPageParams } from './student.service';

@Injectable({
  providedIn: 'root'
})
export class StudentCodeConfigurationService {
  private baseUrl = `${environment.apiUrl}/StudentCodeConfigurations`;

  constructor(private http: HttpClient) {}

  getAll(requestDto?: PaginationRequestDto): Observable<ApiResponse<StudentCodeConfiguration[]>> {
    return this.http.get<ApiResponse<StudentCodeConfiguration[]>>(this.baseUrl, { params: buildPageParams(requestDto) });
  }

  getById(id: string): Observable<ApiResponse<StudentCodeConfiguration>> {
    return this.http.get<ApiResponse<StudentCodeConfiguration>>(`${this.baseUrl}/${id}`);
  }

  getByCategory(categoryId: string): Observable<ApiResponse<StudentCodeConfiguration>> {
    return this.http.get<ApiResponse<StudentCodeConfiguration>>(`${this.baseUrl}/category/${categoryId}`);
  }

  create(item: StudentCodeConfiguration): Observable<ApiResponse<StudentCodeConfiguration>> {
    return this.http.post<ApiResponse<StudentCodeConfiguration>>(this.baseUrl, item);
  }

  update(id: string, item: Partial<StudentCodeConfiguration>): Observable<ApiResponse<StudentCodeConfiguration>> {
    return this.http.put<ApiResponse<StudentCodeConfiguration>>(`${this.baseUrl}/${id}`, item);
  }

  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}
