import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';
import { StudentCategory } from '../models/student.models';
import { buildPageParams } from './student.service';

@Injectable({
  providedIn: 'root'
})
export class StudentCategoryService {
  private baseUrl = `${environment.apiUrl}/StudentCategories`;

  constructor(private http: HttpClient) {}

  getAll(requestDto?: PaginationRequestDto): Observable<ApiResponse<StudentCategory[]>> {
    return this.http.get<ApiResponse<StudentCategory[]>>(this.baseUrl, { params: buildPageParams(requestDto) });
  }

  getById(id: string): Observable<ApiResponse<StudentCategory>> {
    return this.http.get<ApiResponse<StudentCategory>>(`${this.baseUrl}/${id}`);
  }

  create(item: StudentCategory): Observable<ApiResponse<StudentCategory>> {
    return this.http.post<ApiResponse<StudentCategory>>(this.baseUrl, item);
  }

  update(id: string, item: Partial<StudentCategory>): Observable<ApiResponse<StudentCategory>> {
    return this.http.put<ApiResponse<StudentCategory>>(`${this.baseUrl}/${id}`, item);
  }

  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}
