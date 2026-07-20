import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../common/interfaces/common';
import { environment } from '../environments/environments';

export interface PublicityImage {
    id: number;
    filePath: string;
    title?: string | null;
    link?: string | null;
    uploadedOn: string;
}

export interface PublicityImageUploadDto {
    file: File;
    title?: string | null;
    link?: string | null;
}


@Injectable({
    providedIn: 'root'
})
export class PublicityService {
    private apiUrl = `${environment.apiUrl}/Settings/PublicityImages`;
    private uploadUrl = `${environment.apiUrl}/Settings/UploadPublicityImage`;

    constructor(private http: HttpClient) { }

    /**
     * Uploads a new publicity image to the API.
     * @param imageDto The DTO containing the image file and its metadata.
     */
    addPublicityImage(imageDto: PublicityImageUploadDto): Observable<ApiResponse<PublicityImage>> {
        const formData = new FormData();
        formData.append('file', imageDto.file);
        if (imageDto.title) {
            formData.append('title', imageDto.title);
        }
        if (imageDto.link) {
            formData.append('link', imageDto.link);
        }
        return this.http.post<ApiResponse<PublicityImage>>(this.uploadUrl, formData);
    }

    getPublicityImages(tenantId: string | null): Observable<ApiResponse<PublicityImage[]>> {
        return this.http.get<ApiResponse<PublicityImage[]>>(`${this.apiUrl}/public/${tenantId}`);
      }

    /**
     * Deletes a publicity image from the API.
     * @param id The ID of the image to delete.
     */
    deletePublicityImage(id: number, tenantId: string | null): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${id}/tenantId/${tenantId}`);
    }
}
