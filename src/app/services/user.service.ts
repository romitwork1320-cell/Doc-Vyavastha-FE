// src/app/core/services/user.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';

export interface User {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  contactNumber?: string;
  role: string;
  isActive: boolean;
  tenantId: number;
  password?: string;
}

export interface TeamCreateDto {
  username: string;
  firstName?: string;
  lastName?: string;
  contactNumber?: string;
  roleName: string;
  tenantId: number;
}

export interface TeamUpdateDto {
  roleName: string;
  isActive: boolean;
  tenantId: number | null;
  firstName?: string;
  lastName?: string;
  contactNumber?: string;
}

export interface UserTenantLookupDto {
  userId: number;
  displayName: string;
  roleName: string;
}

export interface PageDto {
  pageId: number;
  pageName: string;
  routeUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/Users`;

  constructor(private http: HttpClient) { }

  /**
   * Creates a new user account by sending a POST request to the API.
   * This is used by an admin to register a new user.
   * @param userDto The data for the new user.
   */
  createUser(userDto: TeamCreateDto): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(this.apiUrl, userDto);
  }

  /**
   * Fetches a single user by their ID.
   * @param id The ID of the user to retrieve.
   */
  getUserById(id: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/${id}`);
  }

    /**
     * Fetches a paginated, filtered, and sorted list of contacts from the API.
     * This method replaces the old getAllContacts.
     * @param requestDto The object containing pagination, sort, and filter parameters.
     */
    getUsers(requestDto: PaginationRequestDto): Observable<ApiResponse<User[]>> {
        const params = new HttpParams()
        .set('pageIndex', requestDto.pageIndex.toString())
        .set('pageSize', requestDto.pageSize.toString())
        .set('filter', requestDto.filter || '')
        .set('sortColumn', requestDto.sortColumn || '')
        .set('sortDirection', requestDto.sortDirection || '');
        
        return this.http.get<ApiResponse<User[]>>(this.apiUrl, { params: params });
    }

    updateUser(id: number, userDto: TeamUpdateDto): Observable<ApiResponse<any>> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}`, userDto);
    }

    deleteUser(id: number): Observable<ApiResponse<any>> {
      return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
    }

    removeUserFromTenant(id: number, tenantId: number): Observable<any> {
      // This URL must match your new controller route
      return this.http.delete(`${this.apiUrl}/${id}/tenant/${tenantId}`);
    }

    getTenantUsersLookup(): Observable<ApiResponse<UserTenantLookupDto[]>> {
      return this.http.get<ApiResponse<UserTenantLookupDto[]>>(`${this.apiUrl}/lookup`);
    }

    getAllPages(): Observable<ApiResponse<PageDto[]>> {
      return this.http.get<ApiResponse<PageDto[]>>(`${this.apiUrl}/pages`);
    }

    grantPermission(userId: number, pageId: number, canView: boolean): Observable<ApiResponse<any>> {
      const payload = { userId, pageId, canView };
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/grant-permission`, payload);
    }

    getUserPermissions(userId: number): Observable<ApiResponse<string[]>> {
      // Matches GET api/Users/{id}/permissions
      return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/${userId}/permissions`);
    }
}