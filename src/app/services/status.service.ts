import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse } from '../common/interfaces/common';

export interface Status {
  id: number;
  statusName: string;
  description?: string;
  isActive: boolean;
  statusId?: number;
  isProduct?: boolean | null;
}

export interface StatusCreateDto {
  statusName: string;
  description?: string;
}

export interface StatusUpdateDto {
  id: number;
  statusName: string;
  description?: string;
  isActive: boolean;
}


@Injectable({
  providedIn: 'root'
})
export class StatusService {
  private apiUrl = `${environment.apiUrl}/statuses`; // Adjust API endpoint as needed

  constructor(private http: HttpClient) { }

  /**
   * Fetches all statuses.
   */
  getAllStatuses(): Observable<ApiResponse<Status[]>> {
    return this.http.get<ApiResponse<Status[]>>(this.apiUrl);
  }

  /**
   * Fetches a single status by ID.
   */
  getStatusById(id: number): Observable<ApiResponse<Status>> {
    return this.http.get<ApiResponse<Status>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Creates a new status.
   */
  createStatus(status: StatusCreateDto): Observable<ApiResponse<Status>> {
    return this.http.post<ApiResponse<Status>>(this.apiUrl, status);
  }

  /**
   * Updates an existing status.
   */
  updateStatus(status: StatusUpdateDto): Observable<ApiResponse<Status>> {
    return this.http.put<ApiResponse<Status>>(`${this.apiUrl}/${status.id}`, status);
  }

  /**
   * Deletes a status by ID.
   */
  deleteStatus(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }
}
