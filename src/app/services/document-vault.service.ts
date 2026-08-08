import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environments';
import { Observable } from 'rxjs';

export interface VaultFolder {
  document_type_id: number;
  document_type_name: string;
  file_count: number;
}

export interface VaultFile {
  id: number;
  document_type_id: number;
  document_type_name: string;
  file_name: string;
  original_file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by_name: string;
  source: string;
  created_at: Date;
  grants: any[];
}

@Injectable({
  providedIn: 'root'
})
export class DocumentVaultService {
  private apiUrl = `${environment.apiUrl}/client/vault`;

  constructor(private http: HttpClient) {}

  getFolders(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/folders`);
  }

  getFiles(typeId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/folders/${typeId}/files`);
  }

  uploadFile(typeId: number, fileName: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('documentTypeId', typeId.toString());
    formData.append('fileName', fileName);
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
  }

  renameFile(id: number, fileName: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/rename`, { fileName });
  }

  deleteFile(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  updateGrant(id: number, tenantId: number, action: 'ENABLE' | 'DISABLE'): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/grant`, { tenantId, action });
  }

  downloadFile(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/download`, { responseType: 'blob' });
  }
}
