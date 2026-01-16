import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Entry, EntryCreateDto } from '../../models/entry.model';

@Injectable({
  providedIn: 'root'
})
export class EntryService {
  constructor(private api: ApiService) {}

  getAllEntries(profileId?: number): Observable<Entry[]> {
    const params = profileId ? { profileId: profileId.toString() } : {};
    return this.api.get<Entry[]>('/api/entry', params);
  }

  getEntryById(id: number): Observable<Entry> {
    return this.api.get<Entry>(`/api/entry/${id}`);
  }

  createOrUpdateEntry(entry: EntryCreateDto): Observable<any> {
    return this.api.post('/api/entry', entry);
  }

  importFromFile(profileId: number, file: File): Observable<any> {
    return this.api.uploadFile(`/api/entry/import/${profileId}`, file);
  }

  getSharedManga(profileId1: number, profileId2: number): Observable<any[]> {
    return this.api.get(`/api/entry/shared/${profileId1}/${profileId2}`);
  }

  getUsedFormats(profileId?: number): Observable<any[]> {
    const params = profileId ? { profileId: profileId.toString() } : {};
    return this.api.get('/api/entry/filters/formats', params);
  }

  getUsedPublishers(profileId?: number): Observable<any[]> {
    const params = profileId ? { profileId: profileId.toString() } : {};
    return this.api.get('/api/entry/filters/publishers', params);
  }
}
