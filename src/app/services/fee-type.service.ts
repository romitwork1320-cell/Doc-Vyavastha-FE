import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';
import { FeeType } from '../models/fee.models';
import { buildPageParams } from './student.service';

@Injectable({
  providedIn: 'root'
})
export class FeeTypeService {
  private baseUrl = `${environment.apiUrl}/FeeTypes`;

  constructor(private http: HttpClient) {}

  getAll(requestDto?: PaginationRequestDto): Observable<ApiResponse<FeeType[]>> {
    return this.http.get<ApiResponse<FeeType[]>>(this.baseUrl, { params: buildPageParams(requestDto) });
  }

  getById(id: string): Observable<ApiResponse<FeeType>> {
    return this.http.get<ApiResponse<FeeType>>(`${this.baseUrl}/${id}`);
  }

  create(item: FeeType): Observable<ApiResponse<FeeType>> {
    return this.http.post<ApiResponse<FeeType>>(this.baseUrl, item);
  }

  update(id: string, item: Partial<FeeType>): Observable<ApiResponse<FeeType>> {
    return this.http.put<ApiResponse<FeeType>>(`${this.baseUrl}/${id}`, item);
  }

  delete(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}
