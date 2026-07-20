import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ApiResponse, PaginationRequestDto } from '../common/interfaces/common';
import { environment } from '../environments/environments';

export interface GlobalSearchDto {
  id: number;
  category: string;
  invertDate: string; 
  i_W_No: string;
  contactName: string;
  whatsAppNo: string;
  productName: string;
  serialNo: string;
  newSerialNo?: string;
  invoiceNo: string;
  status: string;
  centerName: string;
  warrantyEndDate?: string | null;
  serviceInvoiceNo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalSearchService {

  // --- API Configuration ---
  private apiUrl = `${environment.apiUrl}/GlobalSearch`;

  // --- UI State Management ---
  private _showSearch = new BehaviorSubject<boolean>(false);
  public showSearch$ = this._showSearch.asObservable();

  private _placeholder = new BehaviorSubject<string>('Search...');
  public placeholder$ = this._placeholder.asObservable();

  private _searchQuery = new BehaviorSubject<string>('');
  public searchQuery$ = this._searchQuery.asObservable();

  private _refresh = new Subject<void>();
  public refresh$ = this._refresh.asObservable();

  constructor(private http: HttpClient) { }

  // --- UI Methods ---

  public show(placeholder: string = 'Search...'): void {
    this._placeholder.next(placeholder);
    this._showSearch.next(true);
  }

  public hide(): void {
    this._showSearch.next(false);
    this.clearSearch(); 
  }

  public updateSearch(query: string): void {
    this._searchQuery.next(query);
  }

  public clearSearch(): void {
    this._searchQuery.next('');
  }

  public triggerRefresh(): void {
    this._refresh.next();
  }

  // --- API Method ---

  public searchFromApi(requestDto: PaginationRequestDto): Observable<ApiResponse<GlobalSearchDto[]>> {
    let params = new HttpParams()
      .set('pageIndex', requestDto.pageIndex.toString())
      .set('pageSize', requestDto.pageSize.toString())
      .set('filter', requestDto.filter || '');

    // NEW: Pass Sorting Parameters if they exist in the DTO
    if (requestDto.sortColumn) {
      params = params.append('sortColumn', requestDto.sortColumn);
    }
    if (requestDto.sortDirection) {
      params = params.append('sortDirection', requestDto.sortDirection);
    }

    return this.http.get<ApiResponse<GlobalSearchDto[]>>(this.apiUrl, { params: params });
  }
}