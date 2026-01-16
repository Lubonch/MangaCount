import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Manga, MangaCreateDto } from '../../models/manga.model';

@Injectable({
  providedIn: 'root'
})
export class MangaService {
  constructor(private api: ApiService) {}

  getAllMangas(): Observable<Manga[]> {
    return this.api.get<Manga[]>('/api/manga');
  }

  getMangaById(id: number): Observable<Manga> {
    return this.api.get<Manga>(`/api/manga/${id}`);
  }

  createOrUpdateManga(manga: MangaCreateDto): Observable<any> {
    if (manga.id && manga.id > 0) {
      return this.api.put(`/api/manga/${manga.id}`, manga);
    }
    return this.api.post('/api/manga', manga);
  }
}
