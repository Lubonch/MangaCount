import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EntryService } from '../../../core/services/entry.service';
import { MangaService } from '../../../core/services/manga.service';
import { Entry, EntryCreateDto } from '../../../models/entry.model';
import { Manga } from '../../../models/manga.model';
import { Profile } from '../../../models/profile.model';

@Component({
  selector: 'app-add-entry-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-entry-modal.component.html',
  styleUrls: ['./add-entry-modal.component.css']
})
export class AddEntryModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() mangas: Manga[] = [];
  @Input() selectedProfile: Profile | null = null;
  @Input() editingEntry: Entry | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  entry: EntryCreateDto = {
    mangaId: 0,
    profileId: 0,
    quantity: 0,
    pending: '',
    priority: false
  };

  selectedMangaName = '';
  isCreatingNewManga = false;

  constructor(
    private entryService: EntryService,
    private mangaService: MangaService
  ) {}

  ngOnInit(): void {
    if (this.editingEntry) {
      this.entry = {
        id: this.editingEntry.id,
        mangaId: this.editingEntry.mangaId,
        profileId: this.editingEntry.profileId,
        quantity: this.editingEntry.quantity,
        pending: this.editingEntry.pending || '',
        priority: this.editingEntry.priority
      };
      this.selectedMangaName = this.editingEntry.manga.name;
    } else {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.entry = {
      mangaId: 0,
      profileId: this.selectedProfile?.id || 0,
      quantity: 0,
      pending: '',
      priority: false
    };
    this.selectedMangaName = '';
    this.isCreatingNewManga = false;
  }

  onMangaSelect(mangaId: string): void {
    const id = parseInt(mangaId);
    if (id > 0) {
      this.entry.mangaId = id;
      this.isCreatingNewManga = false;
      const selectedManga = this.mangas.find(m => m.id === id);
      this.selectedMangaName = selectedManga?.name || '';
    } else {
      this.entry.mangaId = 0;
      this.isCreatingNewManga = true;
    }
  }

  onSubmit(): void {
    if (!this.selectedProfile) return;

    if (this.isCreatingNewManga && this.selectedMangaName.trim()) {
      // Create new manga first
      const newManga = {
        name: this.selectedMangaName.trim(),
        volumes: null,
        formatId: 1, // Default format
        publisherId: 1 // Default publisher
      };

      this.mangaService.createOrUpdateManga(newManga).subscribe({
        next: (manga: any) => {
          this.entry.mangaId = manga.id;
          this.saveEntry();
        },
        error: (error: any) => console.error('Error creating manga', error)
      });
    } else if (this.entry.mangaId > 0) {
      this.saveEntry();
    }
  }

  private saveEntry(): void {
    this.entryService.createOrUpdateEntry(this.entry).subscribe({
      next: () => {
        this.success.emit();
        this.onClose();
      },
      error: (error: any) => console.error('Error saving entry', error)
    });
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }
}
