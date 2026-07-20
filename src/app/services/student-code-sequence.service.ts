import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';
import { StudentCodeSequence } from '../models/student.models';
import { buildPageParams } from './student.service';

@Injectable({
  providedIn: 'root'
})
export class StudentCodeSequenceService {
  private baseUrl = `${environment.apiUrl}/StudentCodeSequences`;

  constructor(private http: HttpClient) {}

  getAll(requestDto?: PaginationRequestDto): Observable<ApiResponse<StudentCodeSequence[]>> {
    return this.http.get<ApiResponse<StudentCodeSequence[]>>(this.baseUrl, { params: buildPageParams(requestDto) });
  }

  getById(id: string): Observable<ApiResponse<StudentCodeSequence>> {
    return this.http.get<ApiResponse<StudentCodeSequence>>(`${this.baseUrl}/${id}`);
  }

  getByYearConfig(yearConfigId: string): Observable<ApiResponse<StudentCodeSequence>> {
    return this.http.get<ApiResponse<StudentCodeSequence>>(`${this.baseUrl}/year-config/${yearConfigId}`);
  }

  create(item: StudentCodeSequence): Observable<ApiResponse<StudentCodeSequence>> {
    return this.http.post<ApiResponse<StudentCodeSequence>>(this.baseUrl, item);
  }

  update(id: string, item: Partial<StudentCodeSequence>): Observable<ApiResponse<StudentCodeSequence>> {
    return this.http.put<ApiResponse<StudentCodeSequence>>(`${this.baseUrl}/${id}`, item);
  }

  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}
