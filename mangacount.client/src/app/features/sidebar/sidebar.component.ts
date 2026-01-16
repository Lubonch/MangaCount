import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService, Theme } from '../../core/services/theme.service';
import { EntryService } from '../../core/services/entry.service';
import { ApiService } from '../../core/services/api.service';
import { Profile } from '../../models/profile.model';
import { Manga } from '../../models/manga.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() mangas: Manga[] = [];
  @Input() selectedProfile: Profile | null = null;
  @Input() refreshing = false;
  @Output() importSuccess = new EventEmitter<void>();
  @Output() backToProfiles = new EventEmitter<void>();
  @Output() addEntryRequested = new EventEmitter<void>();
  @Output() addMangaRequested = new EventEmitter<void>();
  @Output() nukeRequested = new EventEmitter<void>();

  isCollapsed = false;
  showImportSection = false;
  showNukeModal = false;
  importFile: File | null = null;
  nukeConfirmText = '';

  constructor(
    private themeService: ThemeService,
    private entryService: EntryService,
    private apiService: ApiService
  ) {}

  get currentTheme(): Theme {
    let currentTheme: Theme = 'light';
    this.themeService.theme$.subscribe(theme => currentTheme = theme).unsubscribe();
    return currentTheme;
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onFileSelected(event: any): void {
    this.importFile = event.target.files[0];
  }

  importFromFile(): void {
    if (!this.importFile || !this.selectedProfile) return;

    this.entryService.importFromFile(this.selectedProfile.id, this.importFile).subscribe({
      next: () => {
        this.importSuccess.emit();
        this.showImportSection = false;
        this.importFile = null;
        // Reset file input
        const fileInput = document.getElementById('importFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (error: any) => console.error('Error importing file', error)
    });
  }

  openNukeModal(): void {
    this.showNukeModal = true;
    this.nukeConfirmText = '';
  }

  closeNukeModal(): void {
    this.showNukeModal = false;
    this.nukeConfirmText = '';
  }

  confirmNuke(): void {
    if (this.nukeConfirmText !== 'DELETE' || !this.selectedProfile) return;

    this.apiService.post(`/api/database/nuke/${this.selectedProfile.id}`, {}).subscribe({
      next: () => {
        this.nukeRequested.emit();
        this.closeNukeModal();
      },
      error: (error: any) => console.error('Error nuking profile data', error)
    });
  }

  addEntry(): void {
    this.addEntryRequested.emit();
  }

  addManga(): void {
    this.addMangaRequested.emit();
  }

  goBackToProfiles(): void {
    this.backToProfiles.emit();
  }
}
