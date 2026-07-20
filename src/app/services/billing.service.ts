import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';

export interface BillingDocumentItemDto {
  id?: number;
  productId?: number | null;
  itemName: string;
  qty: number;
  rateWithoutTax: number;
  discountValue: number;
  discountType: string;
  taxPercent: number;
  totalAmount: number;
  description?: string;
  sortOrder: number;
}

export interface BillingDocumentDto {
  id?: number;
  documentNo?: string;
  documentType: string;
  documentDate: string;
  dueDate?: string | null;
  vendorRefNo?: string | null;
  contactId?: number | null;
  contactName?: string;
  contactPhone?: string;
  taxType: string;
  discountMode: string;
  invoiceDiscount?: number | null;
  invoiceDiscountType: string;
  basicAmount: number;
  totalDiscount: number;
  roundOff: number;
  netPayable: number;
  internalNotes?: string;
  items: BillingDocumentItemDto[];
}

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private readonly baseUrl = `${environment.apiUrl}/Billing`;

  constructor(private http: HttpClient) { }

  getAll(type: string, pageIndex: number = 0, pageSize: number = 20, filter?: string, sortColumn: string = 'DocumentDate', sortDirection: string = 'desc'): Observable<any> {
    let params = new HttpParams()
      .set('type', type)
      .set('pageIndex', pageIndex.toString())
      .set('pageSize', pageSize.toString())
      .set('sortColumn', sortColumn)
      .set('sortDirection', sortDirection);

    if (filter) {
      params = params.set('filter', filter);
    }

    return this.http.get<any>(this.baseUrl, { params });
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  create(data: BillingDocumentDto): Observable<any> {
    return this.http.post<any>(this.baseUrl, data);
  }

  update(id: number, data: BillingDocumentDto): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }
}
