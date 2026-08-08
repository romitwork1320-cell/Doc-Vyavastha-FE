import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {
  // Assuming environment.apiUrl is managed by interceptor or proxy, using relative paths
  private apiUrl = '/api/Applications';

  constructor(private http: HttpClient) {}

  getApplications(clientId?: number, tenantId?: number): Observable<any> {
    let url = this.apiUrl;
    let params: any = {};
    if (clientId) {
      params.clientId = clientId;
    }
    if (tenantId) {
      params.tenantId = tenantId;
    }
    return this.http.get(url, { params });
  }

  createApplication(payload: any): Observable<any> {
    return this.http.post(this.apiUrl, payload);
  }

  getApplicationDetails(id: number, tenantId?: number): Observable<any> {
    let url = `${this.apiUrl}/${id}`;
    if (tenantId) url += `?tenantId=${tenantId}`;
    return this.http.get(url);
  }

  updateApplication(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, payload);
  }

  generateMagicLink(appId: number, tenantId: number, clientId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${appId}/MagicLink/generate`, { tenantId, clientId });
  }

  archiveApplication(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/archive`, {});
  }

  restoreApplication(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/restore`, {});
  }

  addRequirement(id: number, payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/requirements`, payload);
  }

  getTimeline(id: number, tenantId?: number): Observable<any> {
    let url = `${this.apiUrl}/${id}/timeline`;
    if (tenantId) url += `?tenantId=${tenantId}`;
    return this.http.get(url);
  }

  downloadVersionFile(appId: number, reqId: number, versionId: number, fileId: number, tenantId?: number): Observable<Blob> {
    let url = `${this.apiUrl}/${appId}/requirements/${reqId}/versions/${versionId}/files/${fileId}/download`;
    if (tenantId) url += `?tenantId=${tenantId}`;
    return this.http.get(url, { 
      responseType: 'blob',
      headers: { 'X-Skip-Interceptor': 'true' }
    });
  }

  downloadFinalDeliverable(appId: number, deliverableId: number, tenantId?: number): Observable<Blob> {
    let url = `${this.apiUrl}/${appId}/final-deliverables/${deliverableId}/download`;
    if (tenantId) url += `?tenantId=${tenantId}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  updateStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status });
  }

  reviewRequirement(appId: number, reqId: number, payload: { status: string, reason?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${appId}/requirements/${reqId}/review`, payload);
  }

  uploadFinalDeliverable(appId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/${appId}/final-deliverables`, formData);
  }

  // --- Public Unauthenticated Endpoints ---
  
  getMagicLinkDetails(token: string): Observable<any> {
    return this.http.get(`/api/MagicLink/${token}`);
  }

  uploadDocument(token: string, reqId: number, files: File[]): Observable<any> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    return this.http.post(`/api/MagicLink/${token}/upload/${reqId}`, formData);
  }

  getMagicLinkVaultFolders(token: string): Observable<any> {
    return this.http.get(`/api/MagicLink/${token}/vault/folders`);
  }

  getMagicLinkVaultFiles(token: string, typeId: number): Observable<any> {
    return this.http.get(`/api/MagicLink/${token}/vault/folders/${typeId}/files`);
  }

  uploadFromVault(token: string, reqId: number, clientDocumentIds: number[]): Observable<any> {
    return this.http.post(`/api/MagicLink/${token}/upload/${reqId}/vault`, { clientDocumentIds });
  }
}
