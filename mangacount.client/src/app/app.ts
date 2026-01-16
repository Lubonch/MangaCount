import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProfileService } from './core/services/profile.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App implements OnInit {
  title = 'MangaCount';

  constructor(
    private profileService: ProfileService,
    private themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialize theme
    this.themeService.theme$.subscribe(theme => {
      document.documentElement.setAttribute('data-theme', theme);
    });

    // Initialize routing based on selected profile
    this.profileService.selectedProfile$.subscribe(profile => {
      if (profile) {
        this.router.navigate(['/collection']);
      } else {
        this.router.navigate(['/profiles']);
      }
    });
  }
}
