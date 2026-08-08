import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { ApiResponse } from './dashboard.service';

export interface PaginatedList<T> {
  records: T[];
  totalRecords: number;
  pageSize: number;
  currentPage: number;
}

export interface ClientProfile {
  id: number;
  userId: number;
  fullName: string;
  email?: string;
  phone?: string;
  connectionCode: string;
  photoUrl?: string;
}

export interface Connection {
  id: number;
  clientId: number;
  tenantId: number;
  status: string;
  client?: ClientProfile;
}

export interface ConnectionRequest {
  id: number;
  clientId: number;
  tenantId: number;
  status: string;
}

export interface Invitation {
  id: number;
  tenantId: number;
  email: string;
  phoneNumber?: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export interface ConnectionPermissions {
  id: number;
  connectionId: number;
  viewProfile: boolean;
  viewDocuments: boolean;
  uploadDocuments: boolean;
  createApplications: boolean;
  viewApplications: boolean;
  approveApplications: boolean;
  manageConnection: boolean;
}

@Injectable({ providedIn: 'root' })
export class ClientManagementService {
  private apiClients = `${environment.apiUrl}/clients`;
  private apiConnections = `${environment.apiUrl}/connections`;
  private apiInvitations = `${environment.apiUrl}/invitations`;
  private apiPermissions = `${environment.apiUrl}/connection-permissions`;

  constructor(private http: HttpClient) {}

  // --- Clients ---
  listClients(page: number, pageSize: number, status?: string, search?: string): Observable<ApiResponse<Connection[]>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);
    return this.http.get<ApiResponse<Connection[]>>(this.apiClients, { params });
  }

  searchClient(connectionCode: string): Observable<ApiResponse<ClientProfile>> {
    return this.http.post<ApiResponse<ClientProfile>>(`${this.apiClients}/search`, { clientId: connectionCode });
  }

  getClient(id: number): Observable<ApiResponse<ClientProfile>> {
    return this.http.get<ApiResponse<ClientProfile>>(`${this.apiClients}/${id}`);
  }

  // --- Connections ---
  listConnectionRequests(): Observable<ApiResponse<PaginatedList<ConnectionRequest>>> {
    return this.http.get<ApiResponse<PaginatedList<ConnectionRequest>>>(`${this.apiConnections}/requests`);
  }

  requestConnection(clientId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiConnections}/request`, { clientId });
  }

  acceptConnection(id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiConnections}/${id}/accept`, {});
  }

  rejectConnection(id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiConnections}/${id}/reject`, {});
  }

  removeConnection(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiClients}/${id}`);
  }

  activateConnection(id: number): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiClients}/${id}/activate`, {});
  }

  // --- Invitations ---
  listInvitations(page: number, pageSize: number, status?: string): Observable<ApiResponse<PaginatedList<Invitation>>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (status) params = params.set('status', status);
    return this.http.get<ApiResponse<PaginatedList<Invitation>>>(this.apiInvitations, { params });
  }

  inviteClient(email: string, phone?: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.apiInvitations, { email, phone });
  }

  cancelInvitation(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiInvitations}/${id}`);
  }

  // --- Permissions ---
  updatePermissions(connectionId: number, perms: any): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${this.apiPermissions}/${connectionId}`, perms);
  }
}
