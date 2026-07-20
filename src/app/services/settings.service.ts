// src/app/services/settings.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/app/environments/environments';
import { ApiResponse } from 'src/app/common/interfaces/common';

// src/app/common/interfaces/settings.dto.ts (or similar path)
export interface NotificationSettingsDto {
  enableWhatsAppNotifications: boolean;
  notifyOnReplacementAdd: boolean;
  notifyOnStatusChange: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private apiUrl = `${environment.apiUrl}/Settings`;
  private http = inject(HttpClient);

  getNotificationSettings(): Observable<ApiResponse<NotificationSettingsDto>> {
    return this.http.get<ApiResponse<NotificationSettingsDto>>(`${this.apiUrl}/notifications`);
  }

  updateNotificationSettings(settings: NotificationSettingsDto): Observable<ApiResponse<object>> {
    return this.http.put<ApiResponse<object>>(`${this.apiUrl}/notifications`, settings);
  }
}