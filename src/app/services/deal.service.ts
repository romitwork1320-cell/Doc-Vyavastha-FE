import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environments';
import { Observable } from 'rxjs';

export interface CrmDeal {
  id: number;
  title: string;
  contact: string;
  company: string;
  stageId: number;
  stage: string;
  stageOrder: number;
  value: number;
  probability: number;
  assignedTo: string;
  expectedClose: string;
  status: 'Open' | 'Won' | 'Lost';
  priority?: 'Hot' | 'Warm' | 'Cold';
  color: string;
  lastActivityDate?: string;
  lostReason?: string;
  createdOn: string;
}

export interface PipelineStage {
  id: number;
  name: string;
  order: number;
  color: string;
  probability: number;
  deals: CrmDeal[];
}

@Injectable({
  providedIn: 'root'
})
export class DealService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Deals`;

  getPipeline(): Observable<{ data: PipelineStage[], isSuccess: boolean }> {
    return this.http.get<{ data: PipelineStage[], isSuccess: boolean }>(`${this.apiUrl}/pipeline`);
  }

  getDealById(id: number): Observable<{ data: CrmDeal, isSuccess: boolean }> {
    return this.http.get<{ data: CrmDeal, isSuccess: boolean }>(`${this.apiUrl}/${id}`);
  }

  createDeal(deal: Partial<CrmDeal>): Observable<any> {
    return this.http.post(this.apiUrl, deal);
  }

  updateDeal(id: number, deal: Partial<CrmDeal>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, deal);
  }

  moveDeal(id: number, targetStage: string, newIndex: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/move`, { targetStage, newIndex });
  }

  deleteDeal(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // ==========================
  // PIPELINE STAGES CRUD
  // ==========================

  getAllPipelineStages(): Observable<{ data: PipelineStage[], isSuccess: boolean }> {
    return this.http.get<{ data: PipelineStage[], isSuccess: boolean }>(`${this.apiUrl}/stages`);
  }

  createPipelineStage(stage: Partial<PipelineStage>): Observable<any> {
    return this.http.post(`${this.apiUrl}/stages`, stage);
  }

  updatePipelineStage(id: number, stage: Partial<PipelineStage>): Observable<any> {
    return this.http.put(`${this.apiUrl}/stages/${id}`, stage);
  }

  deletePipelineStage(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/stages/${id}`);
  }
}
