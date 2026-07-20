import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';
import { ApplicationType } from '../models/student.models';
import { buildPageParams } from './student.service';

@Injectable({
  providedIn: 'root'
})
export class ApplicationTypeService {
  private baseUrl = `${environment.apiUrl}/ApplicationTypes`;

  constructor(private http: HttpClient) {}

  getAll(requestDto?: PaginationRequestDto): Observable<ApiResponse<ApplicationType[]>> {
    return this.http.get<ApiResponse<ApplicationType[]>>(this.baseUrl, { params: buildPageParams(requestDto) });
  }

  getById(id: string): Observable<ApiResponse<ApplicationType>> {
    return this.http.get<ApiResponse<ApplicationType>>(`${this.baseUrl}/${id}`);
  }

  create(item: ApplicationType): Observable<ApiResponse<ApplicationType>> {
    return this.http.post<ApiResponse<ApplicationType>>(this.baseUrl, item);
  }

  update(id: string, item: Partial<ApplicationType>): Observable<ApiResponse<ApplicationType>> {
    return this.http.put<ApiResponse<ApplicationType>>(`${this.baseUrl}/${id}`, item);
  }

  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}
