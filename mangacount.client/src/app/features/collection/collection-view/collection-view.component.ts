import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../../core/services/profile.service';
import { EntryService } from '../../../core/services/entry.service';
import { MangaService } from '../../../core/services/manga.service';
import { Entry } from '../../../models/entry.model';
import { Manga } from '../../../models/manga.model';
import { Profile } from '../../../models/profile.model';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { AddEntryModalComponent } from '../add-entry-modal/add-entry-modal.component';
import { AddMangaModalComponent } from '../add-manga-modal/add-manga-modal.component';

@Component({
  selector: 'app-collection-view',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    SidebarComponent, 
    AddEntryModalComponent, 
    AddMangaModalComponent
  ],
  templateUrl: './collection-view.component.html',
  styleUrls: ['./collection-view.component.css']
})
export class CollectionViewComponent implements OnInit {
  entries: Entry[] = [];
  mangas: Manga[] = [];
  selectedProfile: Profile | null = null;
  loading = true;
  
  // Filters
  filterStatus = 'all';
  filterPublisher = 'all';
  filterFormat = 'all';
  sortBy = 'name';
  viewMode: 'cards' | 'table' = 'cards';

  // Filter options
  availablePublishers: any[] = [];
  availableFormats: any[] = [];

  // Modal states
  showAddEntryModal = false;
  showAddMangaModal = false;
  editingEntry: Entry | null = null;
  editingManga: Manga | null = null;

  constructor(
    private profileService: ProfileService,
    private entryService: EntryService,
    private mangaService: MangaService
  ) {}

  ngOnInit(): void {
    this.profileService.selectedProfile$.subscribe(profile => {
      this.selectedProfile = profile;
      if (profile) {
        this.loadData();
      }
    });
  }

  loadData(): void {
    if (!this.selectedProfile) return;

    this.loading = true;
    
    // Load entries
    this.entryService.getAllEntries(this.selectedProfile.id).subscribe({
      next: (entries) => {
        this.entries = entries;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading entries', error);
        this.loading = false;
      }
    });

    // Load mangas
    this.mangaService.getAllMangas().subscribe({
      next: (mangas) => this.mangas = mangas,
      error: (error) => console.error('Error loading mangas', error)
    });

    // Load filter options
    this.loadFilterOptions();
  }

  loadFilterOptions(): void {
    if (!this.selectedProfile) return;

    this.entryService.getUsedFormats(this.selectedProfile.id).subscribe({
      next: (formats) => this.availableFormats = formats,
      error: (error) => console.error('Error loading formats', error)
    });

    this.entryService.getUsedPublishers(this.selectedProfile.id).subscribe({
      next: (publishers) => this.availablePublishers = publishers,
      error: (error) => console.error('Error loading publishers', error)
    });
  }

  get filteredAndSortedEntries(): Entry[] {
    let filtered = this.entries.filter(entry => {
      // Status filter
      if (this.filterStatus !== 'all') {
        const status = this.getEntryStatus(entry);
        if (status !== this.filterStatus) return false;
      }

      // Publisher filter
      if (this.filterPublisher !== 'all') {
        if (entry.manga.publisherId !== parseInt(this.filterPublisher)) return false;
      }

      // Format filter
      if (this.filterFormat !== 'all') {
        if (entry.manga.formatId !== parseInt(this.filterFormat)) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'name':
          return a.manga.name.localeCompare(b.manga.name);
        case 'quantity':
          return b.quantity - a.quantity;
        case 'completion':
          const aPercent = this.getCompletionPercentage(a) || 0;
          const bPercent = this.getCompletionPercentage(b) || 0;
          return bPercent - aPercent;
        default:
          return 0;
      }
    });

    return filtered;
  }

  getEntryStatus(entry: Entry): string {
    const isComplete = entry.manga.volumes && entry.quantity >= entry.manga.volumes;
    if (isComplete) return 'complete';
    if (entry.priority) return 'priority-incomplete';
    return 'incomplete';
  }

  getCompletionPercentage(entry: Entry): number | null {
    if (!entry.manga.volumes || entry.manga.volumes === 0) return null;
    return Math.round((entry.quantity / entry.manga.volumes) * 100);
  }

  updateQuantity(entry: Entry, newQuantity: string): void {
    const quantity = parseInt(newQuantity) || 0;
    const updatedEntry = { 
      ...entry, 
      quantity: quantity,
      pending: entry.pending || undefined // Convert null to undefined 
    };
    this.entryService.createOrUpdateEntry(updatedEntry).subscribe({
      next: () => this.loadData(),
      error: (error) => console.error('Error updating entry', error)
    });
  }

  // Modal handlers
  openAddEntryModal(): void {
    this.editingEntry = null;
    this.showAddEntryModal = true;
  }

  openAddMangaModal(): void {
    this.editingManga = null;
    this.showAddMangaModal = true;
  }

  openEditEntryModal(entry: Entry): void {
    this.editingEntry = entry;
    this.showAddEntryModal = true;
  }

  openEditMangaModal(manga: Manga): void {
    this.editingManga = manga;
    this.showAddMangaModal = true;
  }

  closeAddEntryModal(): void {
    this.showAddEntryModal = false;
    this.editingEntry = null;
  }

  closeAddMangaModal(): void {
    this.showAddMangaModal = false;
    this.editingManga = null;
  }

  onEntrySuccess(): void {
    this.loadData();
  }

  onMangaSuccess(): void {
    this.loadData();
  }

  onImportSuccess(): void {
    this.loadData();
  }

  onNukeRequested(): void {
    this.loadData();
  }

  goBackToProfiles(): void {
    this.profileService.clearSelectedProfile();
  }
}
