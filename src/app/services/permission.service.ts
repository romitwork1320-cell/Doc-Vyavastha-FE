import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';

// --- DTOs for the Permissions Feature ---

export interface PageDto {
  pageId: number;
  pageName: string;
  routeUrl?: string;
}

export interface RoleDto {
  roleId: number;
  roleName: string;
}

export interface RolePagePermissionDto {
  roleId: number;
  pageId: number;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// This is the main object returned by the GET request
export interface PermissionMatrixDto {
  pages: PageDto[];
  roles: RoleDto[];
  permissions: RolePagePermissionDto[];
  totalRecords: number; // For pagination
}

// This is the object sent in the PUT request to save changes
export interface PermissionUpdateDto {
  roleId: number;
  pageId: number;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}


@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private apiUrl = `${environment.apiUrl}/Permissions`;

  constructor(private http: HttpClient) { }

  getPermissions(requestDto: PaginationRequestDto): Observable<ApiResponse<PermissionMatrixDto>> {
    const params = new HttpParams()
      .set('pageIndex', requestDto.pageIndex.toString())
      .set('pageSize', requestDto.pageSize.toString())
      .set('filter', requestDto.filter || '')
      .set('sortColumn', requestDto.sortColumn || '')
      .set('sortDirection', requestDto.sortDirection || '');
    
    return this.http.get<ApiResponse<PermissionMatrixDto>>(this.apiUrl, { params });
  }

  updatePermissions(permissions: PermissionUpdateDto[]): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(this.apiUrl, permissions);
  }
}