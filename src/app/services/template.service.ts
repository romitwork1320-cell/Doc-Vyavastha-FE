import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environments';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface DocumentType {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApplicationTypeDocument {
  document_type_id: number;
  name?: string; // We'll get this from a join in the backend or handle it in the frontend
  description?: string;
  display_order: number;
  is_required: boolean;
}

export interface ApplicationType {
  id: number;
  name: string;
  description?: string;
  documents?: ApplicationTypeDocument[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateDocumentTypeRequest {
  name: string;
  description?: string;
}

export interface CreateApplicationTypeRequest {
  name: string;
  description?: string;
  documents: {
    document_type_id: number;
    display_order: number;
    is_required: boolean;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  private apiUrl = `${environment.apiUrl}/admin/templates`;
  private publicUrl = `${environment.apiUrl}/templates`;

  constructor(private http: HttpClient) {}

  // --- Document Types ---
  getDocumentTypes(): Observable<{ success: boolean, data: DocumentType[] }> {
    return this.http.get<any>(`${environment.apiUrl}/document-types`).pipe(
      map(res => ({
        success: res.success,
        data: (res.data || []).map((d: any) => ({
          id: d.ID,
          name: d.Name,
          description: d.Description,
          created_at: d.CreatedAt,
          updated_at: d.UpdatedAt
        }))
      }))
    );
  }

  createDocumentType(data: CreateDocumentTypeRequest): Observable<{ success: boolean, data: DocumentType }> {
    return this.http.post<any>(`${environment.apiUrl}/document-types`, data).pipe(
      map(res => ({
        success: res.success,
        data: res.data ? {
          id: res.data.ID,
          name: res.data.Name,
          description: res.data.Description
        } : {} as DocumentType
      }))
    );
  }

  updateDocumentType(id: number, data: CreateDocumentTypeRequest): Observable<{ success: boolean, data: DocumentType }> {
    return this.http.put<any>(`${environment.apiUrl}/document-types/${id}`, data).pipe(
      map(res => ({
        success: res.success,
        data: res.data ? {
          id: res.data.ID,
          name: res.data.Name,
          description: res.data.Description
        } : {} as DocumentType
      }))
    );
  }

  deleteDocumentType(id: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/document-types/${id}`);
  }

  // --- Application Types ---
  getTemplatesAdmin(): Observable<{ success: boolean, data: ApplicationType[] }> {
    return this.http.get<any>(`${this.apiUrl}/applications`).pipe(
      map(res => ({
        success: res.success,
        data: (res.data || []).map((app: any) => ({
          id: app.ID,
          name: app.Name,
          description: app.Description,
          created_at: app.CreatedAt,
          updated_at: app.UpdatedAt,
          documents: (app.Documents || []).map((doc: any) => ({
            document_type_id: doc.ID,
            name: doc.Name,
            description: doc.Description,
            display_order: doc.DisplayOrder,
            is_required: doc.IsRequired
          }))
        }))
      }))
    );
  }

  createTemplate(data: CreateApplicationTypeRequest): Observable<{ success: boolean, data: ApplicationType }> {
    return this.http.post<any>(`${this.apiUrl}/applications`, data).pipe(
      map(res => ({
        success: res.success,
        data: res.data ? {
          id: res.data.ID,
          name: res.data.Name,
          description: res.data.Description,
          documents: (res.data.Documents || []).map((doc: any) => ({
            document_type_id: doc.ID,
            name: doc.Name,
            description: doc.Description,
            display_order: doc.DisplayOrder,
            is_required: doc.IsRequired
          }))
        } : {} as ApplicationType
      }))
    );
  }

  updateTemplate(id: number, data: CreateApplicationTypeRequest): Observable<{ success: boolean, data: ApplicationType }> {
    return this.http.put<any>(`${this.apiUrl}/applications/${id}`, data).pipe(
      map(res => ({
        success: res.success,
        data: res.data ? {
          id: res.data.ID,
          name: res.data.Name,
          description: res.data.Description,
          documents: (res.data.Documents || []).map((doc: any) => ({
            document_type_id: doc.ID,
            name: doc.Name,
            description: doc.Description,
            display_order: doc.DisplayOrder,
            is_required: doc.IsRequired
          }))
        } : {} as ApplicationType
      }))
    );
  }

  deleteTemplate(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/applications/${id}`);
  }

  // For Organizations
  getTemplates(): Observable<{ success: boolean, data: ApplicationType[] }> {
    return this.http.get<any>(`${this.publicUrl}/applications`).pipe(
      map(res => ({
        success: res.success,
        data: (res.data || []).map((app: any) => ({
          id: app.ID,
          name: app.Name,
          description: app.Description,
          created_at: app.CreatedAt,
          updated_at: app.UpdatedAt,
          documents: app.Documents || []
        }))
      }))
    );
  }
}
