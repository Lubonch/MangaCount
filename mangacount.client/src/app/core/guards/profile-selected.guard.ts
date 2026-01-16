import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { ProfileService } from '../services/profile.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileSelectedGuard implements CanActivate {
  constructor(
    private profileService: ProfileService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.profileService.selectedProfile$.pipe(
      take(1),
      map(profile => {
        if (profile) {
          return true;
        } else {
          this.router.navigate(['/profiles']);
          return false;
        }
      })
    );
  }
}
