// Trigger recompile
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';
import { FormType } from '../models/student.models';
import { buildPageParams } from './student.service';

@Injectable({
  providedIn: 'root'
})
export class FormTypeService {
  private baseUrl = `${environment.apiUrl}/FormTypes`;

  constructor(private http: HttpClient) {}

  getAll(requestDto?: PaginationRequestDto): Observable<ApiResponse<FormType[]>> {
    return this.http.get<ApiResponse<FormType[]>>(this.baseUrl, { params: buildPageParams(requestDto) });
  }

  getById(id: string): Observable<ApiResponse<FormType>> {
    return this.http.get<ApiResponse<FormType>>(`${this.baseUrl}/${id}`);
  }

  create(item: FormType): Observable<ApiResponse<FormType>> {
    return this.http.post<ApiResponse<FormType>>(this.baseUrl, item);
  }

  update(id: string, item: Partial<FormType>): Observable<ApiResponse<FormType>> {
    return this.http.put<ApiResponse<FormType>>(`${this.baseUrl}/${id}`, item);
  }

  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}
