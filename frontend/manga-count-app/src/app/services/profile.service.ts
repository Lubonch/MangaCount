import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Profile } from '../models/manga.models';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private selectedProfileSubject = new BehaviorSubject<Profile | null>(null);
  public selectedProfile$ = this.selectedProfileSubject.asObservable();

  constructor() {
    // Try to load saved profile from localStorage
    const savedProfile = localStorage.getItem('selectedProfile');
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        this.selectedProfileSubject.next(profile);
      } catch (e) {
        console.warn('Failed to parse saved profile from localStorage');
      }
    }
  }

  selectProfile(profile: Profile | null): void {
    this.selectedProfileSubject.next(profile);
    if (profile) {
      localStorage.setItem('selectedProfile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('selectedProfile');
    }
  }

  getSelectedProfile(): Profile | null {
    return this.selectedProfileSubject.value;
  }
}