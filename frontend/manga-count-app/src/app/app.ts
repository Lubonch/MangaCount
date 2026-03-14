import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';

import { MangaApiService } from './services/manga-api.service';
import { ProfileService } from './services/profile.service';
import { MangaCardComponent } from './components/manga-card.component';
import { Profile, Manga } from './models/manga.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatButtonToggleModule,
    MatCardModule,
    MatDialogModule,
    MatChipsModule,
    MangaCardComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  profiles: Profile[] = [];
  selectedProfile: Profile | null = null;
  mangaList: Manga[] = [];
  searchTerm: string = '';
  filterStatus: string = 'all';

  constructor(
    private mangaApiService: MangaApiService,
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
    this.loadProfiles();
    
    // Subscribe to profile changes
    this.profileService.selectedProfile$.subscribe(profile => {
      this.selectedProfile = profile;
      if (profile) {
        this.loadMangaForProfile(profile.id);
      } else {
        this.mangaList = [];
      }
    });
  }

  loadProfiles(): void {
    this.mangaApiService.getProfiles().subscribe({
      next: (profiles) => {
        this.profiles = profiles;
        // If no profile is selected but there are profiles available, select the first active one
        if (!this.selectedProfile && profiles.length > 0) {
          const activeProfile = profiles.find(p => p.isActive) || profiles[0];
          this.profileService.selectProfile(activeProfile);
        }
      },
      error: (error) => {
        console.error('Failed to load profiles:', error);
      }
    });
  }

  loadMangaForProfile(profileId: number): void {
    const incomplete = this.filterStatus === 'incomplete' ? true : 
                      this.filterStatus === 'complete' ? false : undefined;
    
    this.mangaApiService.getMangaByProfile(profileId, this.searchTerm, incomplete).subscribe({
      next: (manga) => {
        this.mangaList = manga;
        
        // Apply priority filter if needed
        if (this.filterStatus === 'priority') {
          this.mangaList = this.mangaList.filter(m => m.priority);
        }
      },
      error: (error) => {
        console.error('Failed to load manga:', error);
      }
    });
  }

  onProfileChange(event: any): void {
    const profile = event.value as Profile;
    this.profileService.selectProfile(profile);
  }

  onSearchChange(): void {
    if (this.selectedProfile) {
      this.loadMangaForProfile(this.selectedProfile.id);
    }
  }

  onFilterChange(): void {
    if (this.selectedProfile) {
      this.loadMangaForProfile(this.selectedProfile.id);
    }
  }

  openAddProfileDialog(): void {
    const name = prompt('Enter profile name:');
    if (name?.trim()) {
      this.mangaApiService.createProfile(name.trim()).subscribe({
        next: (profile) => {
          this.profiles.push(profile);
          this.profileService.selectProfile(profile);
        },
        error: (error) => {
          console.error('Failed to create profile:', error);
          alert('Failed to create profile. Please try again.');
        }
      });
    }
  }

  openAddMangaDialog(): void {
    // TODO: Implement add manga dialog
    console.log('Add manga dialog - TODO');
  }

  openImportDialog(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.tsv,.txt';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file && this.selectedProfile) {
        this.mangaApiService.importTsv(this.selectedProfile.id, file).subscribe({
          next: (result) => {
            if (result.success) {
              alert(`Successfully imported ${result.importedCount} manga entries.`);
              this.loadMangaForProfile(this.selectedProfile!.id);
            } else {
              alert(`Import completed with errors. Imported ${result.importedCount} entries.\nErrors: ${result.errors.join('\n')}`);
              this.loadMangaForProfile(this.selectedProfile!.id);
            }
          },
          error: (error) => {
            console.error('Import failed:', error);
            alert('Import failed. Please check the file format and try again.');
          }
        });
      }
    };
    input.click();
  }

  exportCollection(): void {
    if (this.selectedProfile) {
      this.mangaApiService.exportTsv(this.selectedProfile.id).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${this.selectedProfile!.name}_manga_collection.tsv`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Export failed:', error);
          alert('Export failed. Please try again.');
        }
      });
    }
  }

  editManga(manga: Manga): void {
    // TODO: Implement edit manga dialog
    console.log('Edit manga:', manga);
  }

  deleteManga(manga: Manga): void {
    if (confirm(`Are you sure you want to delete "${manga.title}"?`)) {
      this.mangaApiService.deleteManga(manga.id).subscribe({
        next: () => {
          this.loadMangaForProfile(this.selectedProfile!.id);
        },
        error: (error) => {
          console.error('Delete failed:', error);
          alert('Failed to delete manga. Please try again.');
        }
      });
    }
  }
}
