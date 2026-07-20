import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments'; // Ensure path is correct
import { PaginationRequestDto } from '../common/interfaces/common';

// --- Quotation Models (Matches C# DTOs) ---

export interface QuotationItemDto {
  id?: number; // Optional for new items
  productName: string;
  warrantyText?: string; // e.g., "(3Y)"
  unitPrice: number;
  quantity: number;
}

export interface QuotationDto {
  id?: number; // ✅ Added for Edit
  customerName: string;
  customerMobile?: string;
  title?: string;
  totalAmount: number;
  finalPrice: number; // The negotiated price
  items: QuotationItemDto[];
  
  // Optional: Backend usually infers these from the token
  tenantId?: number; 
  userId?: number;
}

// --- API Response Model ---
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  statusCode?: number;
  totalRecords?: number; // Added for pagination
}

export interface QuotationListDto {
  id: number;
  quotationNo: string;
  createdOn: string;
  customerName: string;
  customerMobile: string;
  title: string; 
  finalPrice: number;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class QuotationService {

  private apiUrl = `${environment.apiUrl}/Quotations`;

  constructor(private http: HttpClient) { }

  /**
   * Creates a new quotation.
   * Returns the ID of the created quote.
   */
  createQuotation(data: QuotationDto): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(this.apiUrl, data);
  }

  /**
   * Fetches the formatted WhatsApp text for a specific quotation.
   */
  getWhatsAppText(id: number): Observable<ApiResponse<string>> {
    return this.http.get<ApiResponse<string>>(`${this.apiUrl}/${id}/whatsapp`);
  }

  getQuotations(request: PaginationRequestDto): Observable<ApiResponse<QuotationListDto[]>> {
    let params = new HttpParams()
      .set('pageIndex', request.pageIndex.toString())
      .set('pageSize', request.pageSize.toString());

    if (request.filter) params = params.set('filter', request.filter);
    if (request.sortColumn) params = params.set('sortColumn', request.sortColumn);
    if (request.sortDirection) params = params.set('sortDirection', request.sortDirection);
    if (request.fromDate) params = params.set('fromDate', request.fromDate);
    if (request.toDate) params = params.set('toDate', request.toDate);
    if (request.minPrice) params = params.set('minPrice', request.minPrice.toString());
    if (request.maxPrice) params = params.set('maxPrice', request.maxPrice.toString());

    return this.http.get<ApiResponse<QuotationListDto[]>>(this.apiUrl, { params });
  }

  // ✅ Delete
  deleteQuotation(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  // ✅ Get Quotation for Editing (Matches C# GetById)
  // This calls the endpoint that returns the full DTO structure
  getQuotationForEdit(id: number): Observable<ApiResponse<QuotationDto>> {
    return this.http.get<ApiResponse<QuotationDto>>(`${this.apiUrl}/${id}`);
  }

  // ✅ Update Quotation
  updateQuotation(id: number, dto: QuotationDto): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}`, dto);
  }

  duplicateQuotation(id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${id}/duplicate`, {});
  }
}