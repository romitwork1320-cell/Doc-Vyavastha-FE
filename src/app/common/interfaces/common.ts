export interface ApiResponse<T> {
  data?: T | null;
  success: boolean;
  message: string;
  statusCode?: number;
  totalRecords?: number;
}

export interface PaginationRequestDto {
  pageIndex: number;
  pageSize: number;
  filter?: string | null;
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  fromDate?: string | null;
  toDate?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  applicationTypeId?: string | null;
}