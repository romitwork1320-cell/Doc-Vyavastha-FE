import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class MagicLinkService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  getMagicLinkDetails(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/MagicLink/${token}`);
  }

  uploadDocument(token: string, reqId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/MagicLink/${token}/upload/${reqId}`, formData);
  }
}
