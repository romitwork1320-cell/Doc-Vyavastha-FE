import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  contact: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BranchRequest {
  name: string;
  code?: string;
  address?: string;
  contact?: string;
  status?: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  totalCount?: number;
  totalRecords?: number;
}

@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly apiUrl = `${environment.apiUrl}/Branches`;
  private readonly userBranchUrl = `${environment.apiUrl}/UserBranches`;

  constructor(private http: HttpClient) {}

  getBranches(): Observable<ApiResponse<Branch[]>> {
    return this.http.get<ApiResponse<Branch[]>>(this.apiUrl);
  }

  getBranch(id: string): Observable<ApiResponse<Branch>> {
    return this.http.get<ApiResponse<Branch>>(`${this.apiUrl}/${id}`);
  }

  createBranch(branch: BranchRequest): Observable<ApiResponse<Branch>> {
    return this.http.post<ApiResponse<Branch>>(this.apiUrl, branch);
  }

  updateBranch(id: string, branch: BranchRequest): Observable<ApiResponse<Branch>> {
    return this.http.put<ApiResponse<Branch>>(`${this.apiUrl}/${id}`, branch);
  }

  deleteBranch(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`);
  }

  getUserBranches(userId: number): Observable<ApiResponse<Branch[]>> {
    return this.http.get<ApiResponse<Branch[]>>(`${this.userBranchUrl}/user/${userId}`);
  }

  assignUserToBranch(branchId: string, userId: number): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/${branchId}/users/${userId}`, {});
  }

  removeUserFromBranch(branchId: string, userId: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${branchId}/users/${userId}`);
  }
}
