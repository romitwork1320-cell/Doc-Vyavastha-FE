import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Contact } from './contacts.service';
import { Status } from './status.service';
import { environment } from '../environments/environments';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';

// --- Backend-facing DTOs (Data Transfer Objects) ---
export interface ReplacementProductCreateDto {
  selectedProductId?: number;
  manualProductName?: string;
  existingInvoiceProductId?: number;
  serialNoValue: string;
  isManualEntry: boolean;
  manualInvoiceNo?: string;
  manualInvoiceDate?: string | null;
  manualWarrantyDuration?: number;
  manualWarrantyUnit?: string;
  serviceCenterId?: number | null;
  oldSerialNo?: string;
  newSerialNo: string;
  warrantyEndDate?: string | null;
  isUnderWarranty?: boolean | null;
  managedBy?: string | null;
  replacedFromReplacementProductId: number | null;
  statusId: number | null;
  serviceCenterName?: string;
  isUpgraded?: boolean;
  upgradedProductId?: number | null;
  upgradedProductName?: string | null;
  updateProductDefaultWarranty?: boolean;
}

export interface ReplacementRequestDto {
  contact: Contact;
  replacedItems: ReplacementProductCreateDto[];
  status: Status;
}

export interface ReplacementProduct {
  groupStatus: string | undefined;
  id: number;
  invoiceProductId: number;
  serviceCenterId: number;
  oldSerialNo: string;
  newSerialNo: string;
  warrantyEndDate: string | null;
  isUnderWarranty: boolean;
  managedBy: string;
  replacedFromReplacementProductId: number | null;
  createdOn: string;
  updatedOn: string | null;
  isActive: boolean;
  contactName: string;
  contactNo: string;
  invoiceDate: string;
  invoiceNo: string;
  warrantyDuration?: number;
  warrantyUnit: string;
  statusName?: string;
  statusId?: number;
  calculatedWarrantyEndDate: string;
  isCurrentlyUnderWarranty: string;
  productName: string;
  productSerialNo: string;
  contactId: number | null;
  invertNo?: string;
  invertDate?: string;
  serviceCenterName?: string;
  note?: string;
  productStatusId?: number;
  serviceInvoiceNo?: string;
  productStatusName?: string;
  isUpgraded?: boolean;
  upgradedProductId?: number;
  assignedToUserId?: number;
  
  // UI Fields for Multi-Product Progress
  completionPercentage?: number;
  totalProductsCount?: number;
  completedProductsCount?: number;
}


// DTO to handle both single and multiple item updates
export interface ReplacementUpdateDto {
  invertNo: string | undefined; 
  items: ReplacementProductUpdateDto[];
  itemsToAdd: ReplacementProductCreateDto[];
  whatsAppNumber?: string | null;
  contactId?: number | null;
  contactNo?: string | null;
}

// DTO for a single ReplacementProduct update item
export interface ReplacementProductUpdateDto {
  id: number;
  statusId?: number; // Made optional just in case
  productId?: number | null;
  manualProductName?: string | null;
  serialNo?: string | null;
  invoiceNo?: string | null;
  invoiceDate?: string | null;
  warrantyDuration?: number | null;
  warrantyUnit?: string | null;
  serviceCenterId?: number | null;
  productStatusId?: number | null;
  serviceInvoiceNo?: string | null;
  newSerialNo?: string | null;
  notes?: string | null;
  isUpgraded?: boolean;
  upgradedProductId?: number | null;
  upgradedProductName?: string | null;
  givenByUserId?: number | null; 
  receivedByUserId?: number | null;
  updateProductDefaultWarranty?: boolean;
}

export interface FieldExecutiveUpdateDto {
  id: number;
  invertNo: string;
  actionType: number; // 1=Pickup, 2=Handover, 3=Collect
  userId: number;
  statusId?: number; // Optional (e.g. 6 for Not Accepted)
  serviceInvoiceNo?: string;
  tentativeDate?: string; // Send as ISO string
  productStatusId?: number; // Repair/Replace/Reject
  newSerialNo?: string;
  isUpgraded?: boolean;
  upgradedProductId?: number;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReplacementProductService {
  private apiUrl = `${environment.apiUrl}/ReplacementProducts`;
  
  constructor(private http: HttpClient) { }
  
  addFullReplacement(requestDto: ReplacementRequestDto): Observable<ApiResponse<object>> {
    return this.http.post<ApiResponse<object>>(`${this.apiUrl}`, requestDto);
  }
  
  /**
   * Fetches a paginated, filtered, and sorted list of products from the API.
   * This replaces the old getAllProducts method.
   * @param requestDto The object containing pagination, sort, and filter parameters.
  */
 getReplacementProducts(requestDto: PaginationRequestDto): Observable<ApiResponse<ReplacementProduct[]>> {
   const params = new HttpParams()
   .set('pageIndex', requestDto.pageIndex.toString())
   .set('pageSize', requestDto.pageSize.toString())
   .set('filter', requestDto.filter || '')
   .set('sortColumn', requestDto.sortColumn || '')
   .set('sortDirection', requestDto.sortDirection || '');
   
   return this.http.get<ApiResponse<ReplacementProduct[]>>(this.apiUrl, { params: params });
  }
  
  getLogisticsProducts(requestDto: PaginationRequestDto): Observable<ApiResponse<ReplacementProduct[]>> {
    const params = new HttpParams()
    .set('pageIndex', requestDto.pageIndex.toString())
    .set('pageSize', requestDto.pageSize.toString())
    .set('filter', requestDto.filter || '')
    .set('sortColumn', requestDto.sortColumn || '')
    .set('sortDirection', requestDto.sortDirection || '');
    
    // Calls the new endpoint
    return this.http.get<ApiResponse<ReplacementProduct[]>>(`${this.apiUrl}/logistics`, { params: params });
  }
  
  getReplacementProductById(id?: number): Observable<ApiResponse<ReplacementProduct>> {
    return this.http.get<ApiResponse<ReplacementProduct>>(`${this.apiUrl}/${id}`);
  }
  
  getReplacementProductsByInvertNo(invertNo?: string): Observable<ApiResponse<ReplacementProduct[]>> {
    return this.http.get<ApiResponse<ReplacementProduct[]>>(`${this.apiUrl}/invertNo/${invertNo}`);
  }
  
  getReplacementProductByEncryptedInvertNo(tenantId: string, invertNo?: string): Observable<ApiResponse<ReplacementProduct[]>> {
    return this.http.get<ApiResponse<ReplacementProduct[]>>(`${this.apiUrl}/public/${tenantId}/invertNo/${invertNo}`);
  }
  
  // New centralized method for updating one or more items.
  // The backend should be ready to receive a list of items to update.
  updateReplacement(dto: ReplacementUpdateDto): Observable<ApiResponse<object>> {
    return this.http.put<ApiResponse<object>>(`${this.apiUrl}/update`, dto);
  }
  
  updateFieldExecutiveStatus(dto: FieldExecutiveUpdateDto): Observable<ApiResponse<object>> {
    return this.http.post<ApiResponse<object>>(`${this.apiUrl}/field-executive/update`, dto);
  }
  
  deleteReplacementProduct(id: number): Observable<ApiResponse<object>> {
    return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${id}`);
  }
  
  deleteSingleReplacementProduct(replacementProductId: number): Observable<ApiResponse<object>> {
    return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${replacementProductId}`);
  }

  deleteReplacementByInvertNo(invertNo: string, userId: number): Observable<ApiResponse<object>> {
    const params = new HttpParams().set('userId', userId.toString());
    return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${invertNo}`, { params });
  }
  
  getReplacementCount(invoiceProductId: number): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.apiUrl}/count/${invoiceProductId}`);
  }

  getReplacementChain(invoiceProductId: number): Observable<ApiResponse<ReplacementProduct[]>> {
    return this.http.get<ApiResponse<ReplacementProduct[]>>(`${this.apiUrl}/chain/${invoiceProductId}`);
  }

  /**
   * Fetches the Excel import template for replacements.
   */
  getImportTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/template`, {
      responseType: 'blob'
    });
  }

  /**
   * Uploads an Excel file to bulk import replacements.
   * @param file The Excel file to upload.
   */
  importReplacements(file: File): Observable<ApiResponse<object>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ApiResponse<object>>(`${this.apiUrl}/import`, formData);
  }

  /**
   * Exports replacements to an Excel file.
   * @param requestDto The filtering and sorting criteria.
   */
  exportReplacements(requestDto: PaginationRequestDto): Observable<Blob> {
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

  restoreReplacement(id: number): Observable<ApiResponse<object>> {
    return this.http.post<ApiResponse<object>>(`${this.apiUrl}/${id}/restore`, {});
  }

  getTrash(pageIndex: number = 0, pageSize: number = 15): Observable<ApiResponse<any[]>> {
    // Pass params to backend
    const params = new HttpParams()
      .set('pageIndex', pageIndex.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/trash`, { params });
  }
}
