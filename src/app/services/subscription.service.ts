import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse } from '../common/interfaces/common';

export interface Plan {
  planId: number;
  planName: string;
  price: number;
  durationMonths: number;
  durationDays: number;
  whatsAppCredits: number;
  isTrial: boolean;
  isActive: boolean;
}

export interface TenantSubscription {
  subscriptionId: number;
  tenantId: number;
  planId: number;
  startDate: Date;
  endDate: Date;
  status: string; // 'Active', 'Expired'
}

export interface PromoValidationResponse {
  discount: number;
  finalAmount: number;
  promoId: number;
  extensionDays?: number;
}

export interface ManualPaymentDto {
  tenantId: number;
  planId: number;
  promoCodeId?: number;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMode: string;
  referenceNumber: string;
}

export interface ExtendTrialRequest {
  tenantId: number;
  planId: number;
  promoCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private baseUrl = `${environment.apiUrl}/Subscription`;
  private subscriptionStatusSubject = new BehaviorSubject<boolean>(true);
  public isSubscriptionActive$ = this.subscriptionStatusSubject.asObservable();
  private daysRemainingSubject = new BehaviorSubject<number>(30); 
  public daysRemaining$ = this.daysRemainingSubject.asObservable();

  constructor(private http: HttpClient) {}

  getAllPlans(): Observable<ApiResponse<Plan[]>> {
    return this.http.get<ApiResponse<Plan[]>>(`${this.baseUrl}/plans`);
  }

  getCurrentSubscription(tenantId: number): Observable<ApiResponse<TenantSubscription>> {
    return this.http.get<ApiResponse<TenantSubscription>>(`${this.baseUrl}/current/${tenantId}`)
      .pipe(
        tap((response) => {
           const data = response.data;
           
           const isActive = !!(response.success && data && data.status === 'Active');
           this.updateGlobalStatus(isActive);
           let days = 0;
           if (data && data.endDate) {
              const end = new Date(data.endDate);
              const now = new Date();
              days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24));
           }

           // Update the global variable
           this.daysRemainingSubject.next(days);
        })
      );
  }

  updateGlobalStatus(isActive: boolean) {
    this.subscriptionStatusSubject.next(isActive);
  }

  checkSubscriptionStatus(tenantId: number) {
      this.getCurrentSubscription(tenantId).subscribe({
          error: () => {
             this.updateGlobalStatus(false);
             this.daysRemainingSubject.next(0);
          }
      });
  }

  validatePromo(code: string, originalAmount: number, tenantId: number): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/validate-promo`, { code, originalAmount, tenantId });
  }

  recordManualPayment(payment: ManualPaymentDto): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/manual-payment`, payment);
  }

  extendTrial(tenantId: number, planId: number, promoCode: string): Observable<ApiResponse<any>> {
    const request: ExtendTrialRequest = {
      tenantId,
      planId,
      promoCode
    };
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/extend-trial`, request);
  }
}