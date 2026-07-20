import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments'; // Adjust path
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common'; // Adjust path

export interface Tenant {
  tenantId: number;
  companyName: string | null; // From Join, could be null
  tenantName: string;         // From Tenants table
  contactPhone: string | null; // From Join, could be null
  whatsAppSentCount: number; // Use number (maps to long/BIGINT)
  whatsAppBalance: number | null; // Use number | null for nullable int
  isActive: boolean;
  createdDate: string;
  updatedDate: string | null; 
  createdBy: string | number;  
  updatedBy: string | number | null;
  subscriptionEndDate: string | null;
  subscriptionStatus: string | null;
}

// Optional: DTO for adding balance (though simple enough to create inline)
export interface AddBalanceDto {
    amountToAdd: number;
}

// New Interface for Dashboard Cards
export interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  totalBalance: number;
}

// New DTO for creating a tenant
export interface CreateTenantDto {
  companyName: string;
  contactPhone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private apiUrl = `${environment.apiUrl}/Tenants`; // Match your controller route

  constructor(private http: HttpClient) {}

  /**
   * Fetches a paginated, filtered, and sorted list of tenants.
   */
  getTenants(requestDto: PaginationRequestDto): Observable<ApiResponse<Tenant[]>> {
    const params = new HttpParams()
      .set('pageIndex', requestDto.pageIndex.toString())
      .set('pageSize', requestDto.pageSize.toString())
      .set('filter', requestDto.filter || '')
      .set('sortColumn', requestDto.sortColumn || 'TenantId') // Default sort
      .set('sortDirection', requestDto.sortDirection || 'asc'); // Default direction

    return this.http.get<ApiResponse<Tenant[]>>(this.apiUrl, { params: params });
  }

  /**
   * Adds WhatsApp balance to a specific tenant.
   * @param tenantId The ID of the tenant to update.
   * @param amountToAdd The positive integer amount to add.
   * @returns Observable containing the API response with the updated Tenant data.
   */
  addWhatsAppBalance(tenantId: number, amountToAdd: number): Observable<ApiResponse<Tenant>> {
    const dto = { amountToAdd };
    return this.http.put<ApiResponse<Tenant>>(`${this.apiUrl}/${tenantId}/whatsapp-balance`, dto);
  }

  // Add getTenantById, createTenant, updateTenant etc. if needed later

  /**
   * Updates the isActive status for a specific tenant.
   * @param tenantId The ID of the tenant to update.
   * @param isActive The new boolean status.
   * @returns Observable containing the API response.
   */
  updateTenantActiveStatus(tenantId: number, isActive: boolean): Observable<ApiResponse<void>> {
    // Assuming a PUT endpoint to update the status
    // Your backend will need to define this route, e.g., /Tenants/1/status
    const dto = { isActive };
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/${tenantId}/status`, dto);
  }

  /**
   * Fetches summary statistics for the dashboard cards.
   */
  getDashboardStats(): Observable<ApiResponse<DashboardStats>> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.apiUrl}/stats`);
  }

  /**
   * Creates a new tenant (Provisions DB and updates metadata).
   * @param dto Object containing the Company Name and optional phone.
   */
  createTenant(dto: CreateTenantDto): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(this.apiUrl, dto);
  }

  generatePromoCode(payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/Subscription/generate-promo`, payload);
  }
}