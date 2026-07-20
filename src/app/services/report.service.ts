import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';
import { environment } from '../environments/environments';

export interface ReportPaginationRequestDto extends PaginationRequestDto {
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
}

// DTO for a single row in the customer replacement report
export interface CustomerReplacementReportDto {
  id: number;
  name: string;
  contactNo: string;
  replacementVolume: number;
}

// DTO for the detailed report request, including an optional ContactId
export interface DetailedReportPaginationRequestDto extends PaginationRequestDto {
  contactId?: number | null;
}

// DTO for a single row in the detailed replaced product report
export interface ReplacedProductDetailsDto {
  replacementProductId: number;
  oldSerialNo: string | null;
  newSerialNo: string | null;
  productName: string | null;
  managedBy: string | null;
  serviceCenterName: string | null;
  status: string | null;
  replacedDate: string;
  customerName: string | null;
  customerContactNo: string | null;
}

export interface ServiceCenterReportDto {
  serviceCenterName: string;
  status: string;
  productStatusId: number;
  serviceCenterId: number;
  totalCount: number;
}

export interface ServiceCenterProductDetailsDto {
  replacementProductId: number;
  productName: string;
  serialNo: string;
  newSerialNo?: string;
  createdDate: string;
  totalRecords: number;
  iwNo?: string;
  inNo?: string;
  invoiceDate?: string;
  customerName?: string;
  customerContactNo?: string;
  statusName?: string;
  productStatusName?: string;
  serviceInvoiceNo?: string;
  note?: string;
  updatedDate?: string;
  completedDate?: string;
  warrantyDuration?: number;
  warrantyUnit?: string;
  warrantyStatus?: string;
  warrantyEndDate?: string;
  warrantyMonths?: number;
  serviceCenterAddress?: string;
}

export interface PendingReportProductDto {
  replacementProductId: number;
  iwNo: string;
  productName: string;
  serialNo: string;
  inNo: string;
  serviceCenterName: string;
  serviceCenterAddress: string;
  statusName: string;
  warrantyMonths: number;
  warrantyEndDate: string;
  warrantyStatus: string;
  createdDate: string;
  serviceCenterId: number;
  productStatusId: number;
}

export interface InProgressReportProductDto {
  replacementProductId: number;
  iwNo: string;
  productName: string;
  serialNo: string;
  inNo: string;
  serviceCenterName: string;
  serviceCenterAddress: string;
  statusName: string;
  serviceInvoiceNo: string; // Ser. InNo
  updatedDate: string;
  createdDate: string;
  serviceCenterId: number;
  productStatusId: number;
}

export interface ReadyReportProductDto {
  replacementProductId: number;
  iwNo: string;
  productName: string;
  serialNo: string;
  inNo: string;
  serviceCenterName: string;
  serviceCenterAddress: string;
  statusName: string;
  productStatusName: string; // Repair/Replace/Not Accept
  newSerialNo: string;
  updatedDate: string;
  createdDate: string;
  customerName: string;
  customerContactNo: string;
  serviceCenterId: number;
  statusId: number;
  productStatusId: number;
}

export interface CompletedReportProductDto {
  replacementProductId: number;
  iwNo: string;
  productName: string;
  serialNo: string;
  inNo: string;
  serviceCenterName: string;
  serviceCenterAddress: string;
  statusName: string;
  productStatusName: string;
  newSerialNo: string;
  serviceInvoiceNo: string;
  completedDate: string; 
  note: string;
  customerName: string;
  customerContactNo: string;
  createdDate: string;
  serviceCenterId: number;
  statusId: number;
  productStatusId: number;
}

export interface TopProductReportDto {
  productName: string;
  replacementCount: number;
}

export interface MonthlyTrendDto {
  month: number;
  monthName: string;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${environment.apiUrl}/Reports`;

  constructor(private http: HttpClient) { }

  /**
   * Fetches a paginated, filtered, and sorted customer replacement volume report from the API.
   * @param requestDto The object containing pagination, sort, filter, and date range parameters.
   */
  getCustomerReplacementVolumeReport(requestDto: ReportPaginationRequestDto): Observable<ApiResponse<CustomerReplacementReportDto[]>> {
    let params = new HttpParams()
      .set('pageIndex', requestDto.pageIndex.toString())
      .set('pageSize', requestDto.pageSize.toString())
      .set('sortColumn', requestDto.sortColumn || '')
      .set('sortDirection', requestDto.sortDirection || '');

    if (requestDto.filter) {
      params = params.set('filter', requestDto.filter);
    }
    if (requestDto.startDate) {
      params = params.set('startDate', requestDto.startDate);
    }
    if (requestDto.endDate) {
      params = params.set('endDate', requestDto.endDate);
    }
    
    return this.http.get<ApiResponse<CustomerReplacementReportDto[]>>(`${this.apiUrl}/customer-replacement-volume`, { params: params });
  }

  /**
   * Fetches a paginated, filtered, and sorted detailed report of replaced products.
   * @param requestDto The object containing pagination, sort, filter, and an optional contact ID.
   */
  getDetailedReplacedProductReport(requestDto: DetailedReportPaginationRequestDto): Observable<ApiResponse<ReplacedProductDetailsDto[]>> {
    let params = new HttpParams()
      .set('pageIndex', requestDto.pageIndex.toString())
      .set('pageSize', requestDto.pageSize.toString())
      .set('sortColumn', requestDto.sortColumn || '')
      .set('sortDirection', requestDto.sortDirection || '');

    if (requestDto.filter) {
      params = params.set('filter', requestDto.filter);
    }
    if (requestDto.contactId !== undefined && requestDto.contactId !== null) {
      params = params.set('contactId', requestDto.contactId.toString());
    }
    
    return this.http.get<ApiResponse<ReplacedProductDetailsDto[]>>(`${this.apiUrl}/replaced-product-details`, { params: params });
  }

  /**
   * Fetches a paginated, filtered, and sorted service center report from the API.
   * @param requestDto The object containing pagination, sort, and filter parameters.
  */
  getServiceCenterReport(request: ReportPaginationRequestDto): Observable<ApiResponse<ServiceCenterReportDto[]>> {
    const params = this.createParams(request);
    return this.http.get<ApiResponse<ServiceCenterReportDto[]>>(
      `${this.apiUrl}/service-center`, { params }
    );
  }

  getReadyReport(request: ReportPaginationRequestDto): Observable<ApiResponse<ReadyReportProductDto[]>> {
    const params = this.createParams(request);
    return this.http.get<ApiResponse<ReadyReportProductDto[]>>(
      `${this.apiUrl}/service-center/ready-report`, { params }
    );
  }

  /**
 * Fetches a paginated list of products for a specific service center and status.
 * @param serviceCenterId The ID of the service center.
 * @param productStatusId The ID of the product status.
 * @param requestDto The object containing pagination, sort, and filter parameters.
 */
  getServiceCenterProductDetails(
    serviceCenterId: number,
    productStatusId: number,
    requestDto: ReportPaginationRequestDto
  ): Observable<ApiResponse<ServiceCenterProductDetailsDto[]>> {
    let params = new HttpParams()
      .set('serviceCenterId', serviceCenterId.toString())
      .set('productStatusId', productStatusId.toString())
      .set('pageIndex', requestDto.pageIndex.toString())
      .set('pageSize', requestDto.pageSize.toString())
      .set('sortColumn', requestDto.sortColumn || '')
      .set('sortDirection', requestDto.sortDirection || '');

    if (requestDto.filter) {
      params = params.set('filter', requestDto.filter);
    }

    if (requestDto.startDate) {
      params = params.set('startDate', requestDto.startDate);
    }
    if (requestDto.endDate) {
      params = params.set('endDate', requestDto.endDate);
    }

    return this.http.get<ApiResponse<ServiceCenterProductDetailsDto[]>>(`${this.apiUrl}/service-center/product-details`, { params: params });
  }

  getPendingReport(request: ReportPaginationRequestDto): Observable<ApiResponse<PendingReportProductDto[]>> {
    const params = this.createParams(request);
    return this.http.get<ApiResponse<PendingReportProductDto[]>>(
      `${this.apiUrl}/service-center/pending-report`, { params }
    );
  }

  getInProgressReport(request: ReportPaginationRequestDto): Observable<ApiResponse<InProgressReportProductDto[]>> {
    const params = this.createParams(request);
    return this.http.get<ApiResponse<InProgressReportProductDto[]>>(
      `${this.apiUrl}/service-center/in-progress-report`, { params }
    );
  }

  getCompletedReport(request: ReportPaginationRequestDto): Observable<ApiResponse<CompletedReportProductDto[]>> {
    const params = this.createParams(request);
    return this.http.get<ApiResponse<CompletedReportProductDto[]>>(
      `${this.apiUrl}/service-center/completed-report`, { params }
    );
  }

  /**
   * Fetches the top 10 most replaced products.
   * @param requestDto Optional pagination params (useful if you want to sort/filter dynamically later)
   */
  getTopReplacedProducts(requestDto?: ReportPaginationRequestDto): Observable<ApiResponse<TopProductReportDto[]>> {
    let params = new HttpParams();
    
    if (requestDto) {
       params = this.createParams(requestDto);
    } else {
       // Default params if none provided
       params = params.set('pageIndex', '0').set('pageSize', '10');
    }

    return this.http.get<ApiResponse<TopProductReportDto[]>>(`${this.apiUrl}/top-products`, { params: params });
  }

  /**
   * Fetches the monthly replacement trend for the current year.
   */
  getReplacementTrend(): Observable<ApiResponse<MonthlyTrendDto[]>> {
    return this.http.get<ApiResponse<MonthlyTrendDto[]>>(`${this.apiUrl}/trend`);
  }

  private createParams(request: ReportPaginationRequestDto): HttpParams {
    let params = new HttpParams()
      .set('pageIndex', request.pageIndex.toString())
      .set('pageSize', request.pageSize.toString());
  
    if (request.filter) {
      params = params.set('filter', request.filter);
    }
    if (request.sortColumn) {
      params = params.set('sortColumn', request.sortColumn);
    }
    if (request.sortDirection) {
      params = params.set('sortDirection', request.sortDirection);
    }
    if (request.status) {
      params = params.set('status', request.status);
    }
    if (request.startDate) {
      params = params.set('startDate', request.startDate);
    }
    if (request.endDate) {
      params = params.set('endDate', request.endDate);
    }
    return params;
  }
}