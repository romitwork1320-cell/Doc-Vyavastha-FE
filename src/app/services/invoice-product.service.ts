import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../common/interfaces/common';
import { environment } from '../environments/environments';

// Model for InvoiceProduct (simplified for dropdowns)
export interface InvoiceProduct {
  id: number;
  invoiceId: number;
  contactId: number;
  productId: number;
  serialNo: string;
  warrantyDuration: number;
  warrantyUnit: string;
  statusId: number;
  createdOn: string; 
  updatedOn?: string; 
  isActive: boolean;
  invoiceNo: string;
  invoiceDate: string; 
  invoiceIsActive: boolean;
  productName: string;
}


@Injectable({
  providedIn: 'root'
})
export class InvoiceProductService {
  private apiUrl = `${environment.apiUrl}/InvoiceProducts`; // Assuming your API route

  constructor(private http: HttpClient) { }

  getAllInvoiceProducts(): Observable<ApiResponse<InvoiceProduct[]>> {
    return this.http.get<ApiResponse<InvoiceProduct[]>>(this.apiUrl);
  }

  getInvoiceProductById(id: number): Observable<ApiResponse<InvoiceProduct>> {
    return this.http.get<ApiResponse<InvoiceProduct>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get invoice products filtered by optional criteria.
   * @param serialNo Optional serial number filter.
   * @param contactId Optional contact ID filter.
   * @param productId Optional product ID filter.
   */
  getContactProductSerialInvoice(
    serialNo?: string,
    contactId?: number | null,
    productId?: number
  ): Observable<ApiResponse<InvoiceProduct[]>> {
    let params = new HttpParams();

    if (serialNo && serialNo.trim().length > 0) {
      params = params.set('serialNo', serialNo.trim());
    }
    if (contactId && contactId > 0) {
      params = params.set('contactId', contactId.toString());
    }
    if (productId && productId > 0) {
      params = params.set('productId', productId.toString());
    }

    return this.http.get<ApiResponse<InvoiceProduct[]>>(`${this.apiUrl}/ContactProductSerialInvoice`, { params });
  }
}
