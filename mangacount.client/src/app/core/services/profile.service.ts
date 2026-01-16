import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Profile, ProfileCreateDto } from '../../models/profile.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private selectedProfileSubject = new BehaviorSubject<Profile | null>(null);
  public selectedProfile$ = this.selectedProfileSubject.asObservable();

  constructor(private api: ApiService) {
    this.loadSelectedProfileFromStorage();
  }

  getAllProfiles(): Observable<Profile[]> {
    return this.api.get<Profile[]>('/api/profile');
  }

  getProfileById(id: number): Observable<Profile> {
    return this.api.get<Profile>(`/api/profile/${id}`);
  }

  createOrUpdateProfile(profile: ProfileCreateDto): Observable<any> {
    return this.api.post('/api/profile', profile);
  }

  uploadProfilePicture(profileId: number, file: File): Observable<any> {
    return this.api.uploadFile(`/api/profile/upload-picture/${profileId}`, file);
  }

  deleteProfile(id: number): Observable<any> {
    return this.api.delete(`/api/profile/${id}`);
  }

  selectProfile(profile: Profile): void {
    this.selectedProfileSubject.next(profile);
    localStorage.setItem('selectedProfileId', profile.id.toString());
  }

  clearSelectedProfile(): void {
    this.selectedProfileSubject.next(null);
    localStorage.removeItem('selectedProfileId');
  }

  private loadSelectedProfileFromStorage(): void {
    const profileId = localStorage.getItem('selectedProfileId');
    if (profileId) {
      this.getProfileById(parseInt(profileId)).subscribe({
        next: (profile) => this.selectedProfileSubject.next(profile),
        error: (error) => console.error('Failed to load saved profile', error)
      });
    }
  }
}
