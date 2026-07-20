import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';
import { StudentApplication } from '../models/student.models';
import { buildPageParams } from './student.service';

@Injectable({
  providedIn: 'root'
})
export class StudentApplicationService {
  private baseUrl = `${environment.apiUrl}/StudentApplications`;

  constructor(private http: HttpClient) {}

  getAll(requestDto?: PaginationRequestDto): Observable<ApiResponse<StudentApplication[]>> {
    return this.http.get<ApiResponse<StudentApplication[]>>(this.baseUrl, { params: buildPageParams(requestDto) });
  }

  getByStudentId(studentId: string): Observable<ApiResponse<StudentApplication[]>> {
    return this.http.get<ApiResponse<StudentApplication[]>>(`${this.baseUrl}/student/${studentId}`);
  }

  getById(id: string): Observable<ApiResponse<StudentApplication>> {
    return this.http.get<ApiResponse<StudentApplication>>(`${this.baseUrl}/${id}`);
  }

  create(item: StudentApplication): Observable<ApiResponse<StudentApplication>> {
    return this.http.post<ApiResponse<StudentApplication>>(this.baseUrl, item);
  }

  update(id: string, item: Partial<StudentApplication>): Observable<ApiResponse<StudentApplication>> {
    return this.http.put<ApiResponse<StudentApplication>>(`${this.baseUrl}/${id}`, item);
  }

	delete(id: string): Observable<ApiResponse<boolean>> {
		return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
	}

	export(requestDto?: PaginationRequestDto): Observable<Blob> {
		return this.http.get(`${this.baseUrl}/export`, { 
			params: buildPageParams(requestDto), 
			responseType: 'blob' 
		});
	}
}
