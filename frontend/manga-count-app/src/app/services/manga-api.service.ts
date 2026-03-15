import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Profile, Manga, CreateMangaRequest, UpdateMangaRequest, CollectionStats, ImportResult } from '../models/manga.models';

@Injectable({
  providedIn: 'root'
})
export class MangaApiService {
  private readonly baseUrl = 'https://localhost:5001/api';

  constructor(private http: HttpClient) { }

  // Profile endpoints
  getProfiles(): Observable<Profile[]> {
    return this.http.get<Profile[]>(`${this.baseUrl}/profiles`);
  }

  createProfile(name: string): Observable<Profile> {
    return this.http.post<Profile>(`${this.baseUrl}/profiles`, { name });
  }

  updateProfile(id: number, request: { name: string; isActive: boolean }): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/profiles/${id}`, request);
  }

  deleteProfile(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/profiles/${id}`);
  }

  // Manga endpoints
  getMangaByProfile(profileId: number, search?: string, incomplete?: boolean): Observable<Manga[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    if (incomplete !== undefined) {
      params = params.set('incomplete', incomplete.toString());
    }

    return this.http.get<Manga[]>(`${this.baseUrl}/manga/profile/${profileId}`, { params });
  }

  getManga(id: number): Observable<Manga> {
    return this.http.get<Manga>(`${this.baseUrl}/manga/${id}`);
  }

  createManga(request: CreateMangaRequest): Observable<Manga> {
    return this.http.post<Manga>(`${this.baseUrl}/manga`, request);
  }

  updateManga(id: number, request: UpdateMangaRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/manga/${id}`, request);
  }

  deleteManga(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/manga/${id}`);
  }

  // Import/Export endpoints
  importTsv(profileId: number, file: File): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportResult>(`${this.baseUrl}/manga/profile/${profileId}/import-tsv`, formData);
  }

  exportTsv(profileId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/manga/profile/${profileId}/export-tsv`, {
      responseType: 'blob'
    });
  }

  // Statistics endpoint
  getCollectionStats(profileId: number): Observable<CollectionStats> {
    return this.http.get<CollectionStats>(`${this.baseUrl}/manga/profile/${profileId}/stats`);
  }
}
