import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaginationRequestDto } from '../common/interfaces/common';
import { environment } from '../environments/environments';

// --- Service Center Models ---

export interface ServiceCenter {
  id: number;
  name: string;
  address: string; 
  mapLocationUrl?: string; // ✅ NEW: Optional property for the link
  isActive: boolean; 
}

export interface ServiceCenterCreateDto {
  name: string;
  address: string;
  mapLocationUrl?: string; // ✅ NEW
}

export interface ServiceCenterUpdateDto {
  id: number;
  name: string;
  address: string;
  mapLocationUrl?: string; // ✅ NEW
  isActive: boolean;
}

// --- API Response Model ---
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  statusCode?: number;
}

export interface ServiceCenterHistoryItemDto {
  replacementId: number;
  invertNo: string;
  invertDate: string;
  productName: string;
  serialNo: string;
  newSerialNo: string; 
  contactName: string;
  contactNo: string;   
  invoiceNo: string;   
  invoiceDate: string; 
  status: string;
  serviceInvoiceNo: string; 
  note: string;            
}

export interface ServiceCenterHistoryDto {
  id: number;
  name: string;
  address: string;
  isActive: boolean;
  history: ServiceCenterHistoryItemDto[];
}

@Injectable({
  providedIn: 'root'
})
export class ServiceCentersService { 
  private apiUrl = `${environment.apiUrl}/ServiceCenters`; 

  constructor(private http: HttpClient) { }

  /**
     * Fetches a paginated, filtered, and sorted list.
     */
    getServiceCenters(requestDto: PaginationRequestDto): Observable<ApiResponse<ServiceCenter[]>> {
      const params = new HttpParams()
        .set('pageIndex', requestDto.pageIndex.toString())
        .set('pageSize', requestDto.pageSize.toString())
        .set('filter', requestDto.filter || '')
        .set('sortColumn', requestDto.sortColumn || '')
        .set('sortDirection', requestDto.sortDirection || '');
      
      return this.http.get<ApiResponse<ServiceCenter[]>>(this.apiUrl, { params: params });
    }

  /**
   * Fetches a single service center by ID.
   */
  getServiceCenterById(id: number): Observable<ApiResponse<ServiceCenter>> {
    return this.http.get<ApiResponse<ServiceCenter>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Creates a new service center.
   */
  createServiceCenter(serviceCenter: ServiceCenterCreateDto): Observable<ApiResponse<ServiceCenter>> {
    return this.http.post<ApiResponse<ServiceCenter>>(this.apiUrl, serviceCenter);
  }

  /**
   * Updates an existing service center.
   */
  updateServiceCenter(serviceCenter: ServiceCenterUpdateDto): Observable<ApiResponse<ServiceCenter>> {
    return this.http.put<ApiResponse<ServiceCenter>>(`${this.apiUrl}/${serviceCenter.id}`, serviceCenter);
  }

  /**
   * Deletes a service center by ID.
   */
  deleteServiceCenter(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Fetches the Excel import template.
   */
  getImportTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/template`, {
      responseType: 'blob'
    });
  }

  /**
   * Uploads an Excel file to bulk import.
   */
  importServiceCenters(file: File): Observable<ApiResponse<object>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ApiResponse<object>>(`${this.apiUrl}/import`, formData);
  }

  /**
   * Exports service centers to an Excel file.
   */
  exportServiceCenters(requestDto: PaginationRequestDto): Observable<Blob> {
    const params = new HttpParams()
      .set('format', 'excel')
      .set('filter', requestDto.filter || '')
      .set('sortColumn', requestDto.sortColumn || '')
      .set('sortDirection', requestDto.sortDirection || '');

    return this.http.get(`${this.apiUrl}/export`, {
      params: params,
      responseType: 'blob'
    });
  }

  getServiceCenterHistory(serviceCenterId: number): Observable<ApiResponse<ServiceCenterHistoryDto>> {
    return this.http.get<ApiResponse<ServiceCenterHistoryDto>>(`${this.apiUrl}/${serviceCenterId}/history`);
  }
}