import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environments/environments';

export interface OrganizationType {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  statusCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationTypeService {
  private apiUrl = `${environment.apiUrl}/organization-types`;

  constructor(private http: HttpClient) {}

  listOrganizationTypes(): Observable<ApiResponse<OrganizationType[]>> {
    return this.http.get<ApiResponse<any>>(this.apiUrl).pipe(
      map(res => ({
        success: res.success,
        statusCode: res.statusCode,
        message: res.message,
        data: (res.data || []).map((d: any) => ({
          id: d.ID,
          name: d.Name,
          description: d.Description,
          isActive: d.IsActive,
          createdAt: d.CreatedAt,
          updatedAt: d.UpdatedAt
        }))
      }))
    );
  }

  createOrganizationType(data: { name: string; description: string }): Observable<ApiResponse<OrganizationType>> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, data).pipe(
      map(res => ({
        success: res.success,
        statusCode: res.statusCode,
        message: res.message,
        data: {
          id: res.data?.ID,
          name: res.data?.Name,
          description: res.data?.Description,
          isActive: res.data?.IsActive,
          createdAt: res.data?.CreatedAt,
          updatedAt: res.data?.UpdatedAt
        }
      }))
    );
  }

  updateOrganizationType(id: number, data: { name: string; description: string }): Observable<ApiResponse<OrganizationType>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}`, data).pipe(
      map(res => ({
        success: res.success,
        statusCode: res.statusCode,
        message: res.message,
        data: {
          id: res.data?.ID,
          name: res.data?.Name,
          description: res.data?.Description,
          isActive: res.data?.IsActive,
          createdAt: res.data?.CreatedAt,
          updatedAt: res.data?.UpdatedAt
        }
      }))
    );
  }

  deleteOrganizationType(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}
