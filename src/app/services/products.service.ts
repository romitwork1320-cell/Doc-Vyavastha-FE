import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';

export interface Product {
  id: number;
  name: string;
  isActive: boolean;
  defaultWarrantyDuration?: number | null; 
  defaultWarrantyUnit?: string | null;    
}

export interface ProductCreateDto {
  name: string;
  defaultWarrantyDuration?: number | null; 
  defaultWarrantyUnit?: string | null;     
}

export interface ProductUpdateDto {
  id: number;
  name: string;
  isActive: boolean;
  defaultWarrantyDuration?: number | null; 
  defaultWarrantyUnit?: string | null;     
}

export interface ProductHistoryItemDto {
  replacementId: number;
  invertNo: string;
  invertDate: string; // ISO Date String
  contactName: string;
  contactNo: string;
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

export interface ProductHistoryDto {
  id: number;
  name: string;
  isActive: boolean;
  history: ProductHistoryItemDto[];
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) { }

  /**
   * Fetches a paginated, filtered, and sorted list of products from the API.
   * This replaces the old getAllProducts method.
   * @param requestDto The object containing pagination, sort, and filter parameters.
   */
  getProducts(requestDto: PaginationRequestDto): Observable<ApiResponse<Product[]>> {
    const params = new HttpParams()
      .set('pageIndex', requestDto.pageIndex.toString())
      .set('pageSize', requestDto.pageSize.toString())
      .set('filter', requestDto.filter || '')
      .set('sortColumn', requestDto.sortColumn || '')
      .set('sortDirection', requestDto.sortDirection || '');
    
    return this.http.get<ApiResponse<Product[]>>(this.apiUrl, { params: params });
  }

  /**
   * Fetches a single product by ID.
   */
  getProductById(id: number): Observable<ApiResponse<Product>> {
    return this.http.get<ApiResponse<Product>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Creates a new product.
   */
  createProduct(product: ProductCreateDto): Observable<ApiResponse<Product>> {
    return this.http.post<ApiResponse<Product>>(this.apiUrl, product);
  }

  /**
   * Updates an existing product.
   */
  updateProduct(product: ProductUpdateDto): Observable<ApiResponse<Product>> {
    return this.http.put<ApiResponse<Product>>(`${this.apiUrl}/${product.id}`, product);
  }

  /**
   * Deletes a product by ID.
   */
  deleteProduct(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Fetches the Excel import template for products.
   */
  getImportTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/template`, {
      responseType: 'blob'
    });
  }

  /**
   * Uploads an Excel file to bulk import products.
   * @param file The Excel file to upload.
   */
  importProducts(file: File): Observable<ApiResponse<object>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ApiResponse<object>>(`${this.apiUrl}/import`, formData);
  }

  /**
   * Exports products to an Excel file.
   * @param requestDto The filtering and sorting criteria.
   */
  exportProducts(requestDto: PaginationRequestDto): Observable<Blob> {
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

  getProductHistory(productId: number): Observable<ApiResponse<ProductHistoryDto>> {
    return this.http.get<ApiResponse<ProductHistoryDto>>(`${this.apiUrl}/${productId}/history`);
  }
}