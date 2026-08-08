import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environments/environments';

export interface DocumentType {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentTypeService {
  private apiUrl = `${environment.apiUrl}/document-types`;

  constructor(private http: HttpClient) {}

  getDocumentTypes(): Observable<any> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(res => {
        const records = res.data || res || [];
        return {
          success: res.success !== undefined ? res.success : true,
          data: (Array.isArray(records) ? records : []).map((d: any) => ({
            id: d.ID || d.id,
            name: d.Name || d.name,
            description: d.Description || d.description,
            is_active: d.IsActive || d.is_active
          }))
        };
      })
    );
  }
}
