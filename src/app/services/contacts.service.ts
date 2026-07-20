import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';

export interface Contact {
  id: number | null;
  name: string;
  contactNo: string;
  whatsAppNumber?: string;
  emailId?: string | null;
  isActive: boolean;
}

export interface ContactCreateDto {
  name: string;
  contactNo: string;
  emailId?: string | null;
  whatsAppNumber?: string;
}

export interface ContactUpdateDto {
  id: number | null;
  name: string;
  contactNo: string;
  emailId?: string | null;
  isActive: boolean;
  whatsAppNumber?: string;
}

export interface ContactProductDetailsDto {
  invoiceProductId: number;
  serialNo: string;
  productName: string;
  invoiceNo: string;
  invoiceDate: string;
  warrantyDuration: number;
  warrantyUnit: string;
  currentStatus: string;
  productRegisteredOn: string;
  calculatedWarrantyEndDate: string | null;
  isCurrentlyUnderWarranty: string;
}

export interface ContactHistoryItemDto {
  replacementId: number;
  invertNo: string;
  invertDate: string;
  productName: string;
  invoiceNo: string;      
  invoiceDate: string;      
  serialNo: string;
  newSerialNo: string;      
  warrantyEndDate: string;  
  isUnderWarranty: boolean; 
  status: string;
  serviceCenterName: string;
  serviceInvoiceNo: string; 
  note: string;            
}

export interface ContactHistoryDto {
  id: number;
  name: string;
  contactNo: string;
  emailId: string;
  whatsAppNumber: string;
  isActive: boolean;
  history: ContactHistoryItemDto[];
}

// =================== UPDATED SERVICE ====================

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private apiUrl = `${environment.apiUrl}/Contacts`;

  constructor(private http: HttpClient) { }

  /**
   * Fetches a paginated, filtered, and sorted list of contacts from the API.
   * This method replaces the old getAllContacts.
   * @param requestDto The object containing pagination, sort, and filter parameters.
   */
  getContacts(requestDto: PaginationRequestDto): Observable<ApiResponse<Contact[]>> {
    const params = new HttpParams()
      .set('pageIndex', requestDto.pageIndex.toString())
      .set('pageSize', requestDto.pageSize.toString())
      .set('filter', requestDto.filter || '')
      .set('sortColumn', requestDto.sortColumn || '')
      .set('sortDirection', requestDto.sortDirection || '');
    
    return this.http.get<ApiResponse<Contact[]>>(this.apiUrl, { params: params });
  }

  getContactById(id: number): Observable<ApiResponse<Contact>> {
    return this.http.get<ApiResponse<Contact>>(`${this.apiUrl}/${id}`);
  }

  getContactHistory(contactId: number): Observable<ApiResponse<ContactHistoryDto>> {
    return this.http.get<ApiResponse<ContactHistoryDto>>(`${this.apiUrl}/${contactId}/history`);
  }

  createContact(contact: ContactCreateDto): Observable<ApiResponse<Contact>> {
    return this.http.post<ApiResponse<Contact>>(this.apiUrl, contact);
  }

  updateContact(contact: ContactUpdateDto): Observable<ApiResponse<Contact>> {
    return this.http.put<ApiResponse<Contact>>(`${this.apiUrl}/${contact.id}`, contact);
  }

  deleteContact(id: number | null): Observable<ApiResponse<object>> {
    return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${id}`);
  }

  getAllProductsForContact(contactId: number): Observable<ApiResponse<ContactProductDetailsDto[]>> {
    return this.http.get<ApiResponse<ContactProductDetailsDto[]>>(`${this.apiUrl}/${contactId}/products`);
  }

  exportContacts(format: 'excel' | 'pdf', requestDto: PaginationRequestDto): Observable<Blob> {
    const params = new HttpParams()
      .set('format', format)
      .set('filter', requestDto.filter || '')
      .set('sortColumn', requestDto.sortColumn || '')
      .set('sortDirection', requestDto.sortDirection || '');

    // Note the responseType: 'blob', which is crucial for handling file downloads.
    return this.http.get(`${this.apiUrl}/export`, {
      params: params,
      responseType: 'blob' 
    });
  }

  importContacts(file: File): Observable<ApiResponse<object>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    
    // Note: When sending FormData, Angular handles the headers automatically.
    return this.http.post<ApiResponse<object>>(`${this.apiUrl}/import`, formData);
  }

  getImportTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/template`, {
      responseType: 'blob'
    });
  }
}