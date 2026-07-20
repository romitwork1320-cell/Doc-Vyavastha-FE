import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';
import { Student } from '../models/student.models';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private baseUrl = `${environment.apiUrl}/Students`;

  constructor(private http: HttpClient) {}

  getAll(requestDto?: PaginationRequestDto): Observable<ApiResponse<Student[]>> {
    return this.http.get<ApiResponse<Student[]>>(this.baseUrl, { params: buildPageParams(requestDto) });
  }

  getById(id: string): Observable<ApiResponse<Student>> {
    return this.http.get<ApiResponse<Student>>(`${this.baseUrl}/${id}`);
  }

  create(item: Student): Observable<ApiResponse<Student>> {
    return this.http.post<ApiResponse<Student>>(this.baseUrl, item);
  }

  update(id: string, item: Partial<Student>): Observable<ApiResponse<Student>> {
    return this.http.put<ApiResponse<Student>>(`${this.baseUrl}/${id}`, item);
  }

	delete(id: string): Observable<ApiResponse<boolean>> {
		return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
	}

	export(requestDto?: PaginationRequestDto, applicationTypeId?: string): Observable<Blob> {
		let params = buildPageParams(requestDto);
		if (applicationTypeId) {
			params = params.set('applicationTypeId', applicationTypeId);
		}
		return this.http.get(`${this.baseUrl}/export`, { params, responseType: 'blob' });
	}
}

/** Serialises a PaginationRequestDto into the query params the backend reads. */
export function buildPageParams(req?: PaginationRequestDto): HttpParams {
  let params = new HttpParams();
  if (!req) {
    return params;
  }
  params = params
    .set('pageIndex', (req.pageIndex ?? 0).toString())
    .set('pageSize', (req.pageSize ?? 50).toString());
  if (req.filter) params = params.set('filter', req.filter);
  if (req.sortColumn) params = params.set('sortColumn', req.sortColumn);
  if (req.sortDirection) params = params.set('sortDirection', req.sortDirection);
  if (req.fromDate) params = params.set('fromDate', req.fromDate);
  if (req.toDate) params = params.set('toDate', req.toDate);
  if (req.applicationTypeId) params = params.set('applicationTypeId', req.applicationTypeId);
  return params;
}
