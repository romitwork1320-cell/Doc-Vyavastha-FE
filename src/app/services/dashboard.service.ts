import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';
import { environment } from '../environments/environments';

// This interface must match the DTO from your .NET backend.
export interface StatusCountsDto {
  groupStatus: string | null;
  totalCount: number | null;
}

export interface RequiresActionDto {
  invertNo: string;
  customerName: string;
  productName: string;
  timePending: string;
}

// This service is dedicated to fetching dashboard-related data.
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/Dashboard`;
  private activityUpdatedSource = new Subject<void>();
  public activityUpdated$ = this.activityUpdatedSource.asObservable();

  notifyActivityUpdate() {
    this.activityUpdatedSource.next();
  }

  constructor(private http: HttpClient) { }

  /**
   * Fetches the count of replacement products grouped by status.
   * Calls the new API endpoint: GET api/Dashboard/status-counts
   * @returns An Observable of an ApiResponse containing a list of StatusCountsDto.
   */
  getStatusCounts(): Observable<ApiResponse<StatusCountsDto[]>> {
    // We use the full URL to the new endpoint.
    return this.http.get<ApiResponse<StatusCountsDto[]>>(`${this.apiUrl}/status-counts`);
  }

  /**
   * Fetches SLA alerts with infinite scroll pagination.
   */
  getRequiresActionAlerts(requestDto: PaginationRequestDto): Observable<ApiResponse<RequiresActionDto[]>> {
    const params = new HttpParams()
      .set('pageIndex', requestDto.pageIndex.toString())
      .set('pageSize', requestDto.pageSize.toString());
      // Note: We don't necessarily need filter/sort for this widget, but HttpParams keeps it clean!

    return this.http.get<ApiResponse<RequiresActionDto[]>>(`${this.apiUrl}/requires-action`, { params: params });
  }
}