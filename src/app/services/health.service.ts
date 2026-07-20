import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';

export interface HealthCheckData {
  sizeMb?: number;
  connections?: number;
  lastBackup?: Date;
  dbName?: string;
}

export interface HealthCheckResult {
  key: string;
  status: string;
  description: string;
  duration: number;
  error?: string;
  data?: HealthCheckData;
}

export interface SystemHealth {
  status: string;
  totalDuration: number;
  checkedAt: Date;
  results: HealthCheckResult[];
}

@Injectable({
  providedIn: 'root'
})
export class HealthService {
  // Direct path to the endpoint defined in Program.cs
  // Note: We use .replace('/api', '') assuming your environment.apiUrl is ".../api" 
  // but the health check is at root level ".../health".
  private healthUrl = `${environment.apiUrl.replace('/api', '')}/health`; 

  constructor(private http: HttpClient) {}

  checkHealth(): Observable<SystemHealth> {
    return this.http.get<SystemHealth>(this.healthUrl);
  }

  downloadBackup(dbName: string): Observable<Blob> {
    const url = `${environment.apiUrl.replace('/api', '')}/api/DatabaseAdmin/backup/${dbName}`;
    return this.http.get(url, {
      responseType: 'blob', // IMPORTANT: Tells Angular to expect a binary file
      headers: new HttpHeaders({ 'Accept': 'application/octet-stream' })
    });
  }
}