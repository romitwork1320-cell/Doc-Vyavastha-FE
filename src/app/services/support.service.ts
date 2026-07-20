import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse } from '../common/interfaces/common';

// --- Support Models ---

// 1. DTO for Creating a Ticket
export interface CreateTicketDto {
  subject: string;
  category: string; // 'Bug', 'Feature', 'Billing', etc.
  priority: string; // 'Low', 'Medium', 'High'
  description: string;
  attachmentUrl?: string; // Optional URL if you implement file upload
  tenantId: number; 
  userId: number;
}

// 2. DTO for Replying
export interface ReplyTicketDto {
  ticketId: number;
  senderUserId: number;
  isAdminReply: boolean;
  message: string;
  attachmentUrl?: string;
}

// 3. Grid List Item Model
export interface TicketListDto {
  id: number;
  ticketNo: string;
  subject: string;
  category: string;
  priority: string;
  status: string; 
  createdByName: string;
  updatedOn: string; 
  tenantId?: number;    
  tenantName?: string;
}

// 4. Detail View Models
export interface MessageDto {
  id: number;
  message: string;
  isAdminReply: boolean;
  createdOn: string;
  attachmentUrl?: string;
}

export interface TicketDetailDto {
  header: TicketListDto;
  history: MessageDto[];
}

@Injectable({
  providedIn: 'root'
})
export class SupportService {
  private apiUrl = `${environment.apiUrl}/Support`;

  constructor(private http: HttpClient) { }

  /**
   * Creates a new support ticket.
   */
  createTicket(dto: CreateTicketDto): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(`${this.apiUrl}/create`, dto);
  }

  /**
   * Adds a reply to an existing ticket.
   */
  replyTicket(dto: ReplyTicketDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/reply`, dto);
  }

  /**
   * Fetches a list of tickets.
   * If tenantId is 0, it fetches all (Admin View).
   */
  getTickets(tenantId: number = 0, status: string = ''): Observable<ApiResponse<TicketListDto[]>> {
    let params = new HttpParams().set('tenantId', tenantId.toString());
    
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<ApiResponse<TicketListDto[]>>(`${this.apiUrl}/list`, { params });
  }

  /**
   * Fetches full details and chat history for a specific ticket.
   */
  getTicketDetails(id: number): Observable<ApiResponse<TicketDetailDto>> {
    return this.http.get<ApiResponse<TicketDetailDto>>(`${this.apiUrl}/${id}`);
  }

  updateTicketStatus(ticketId: number, status: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${ticketId}/status`, { status });
  }
}