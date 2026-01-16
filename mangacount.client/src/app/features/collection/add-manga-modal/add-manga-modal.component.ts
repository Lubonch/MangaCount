import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MangaService } from '../../../core/services/manga.service';
import { ApiService } from '../../../core/services/api.service';
import { Manga, MangaCreateDto, Format, Publisher } from '../../../models/manga.model';

@Component({
  selector: 'app-add-manga-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-manga-modal.component.html',
  styleUrls: ['./add-manga-modal.component.css']
})
export class AddMangaModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() editingManga: Manga | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  manga: MangaCreateDto = {
    name: '',
    volumes: null,
    formatId: 1,
    publisherId: 1
  };

  formats: Format[] = [];
  publishers: Publisher[] = [];
  newFormatName = '';
  newPublisherName = '';
  showNewFormatInput = false;
  showNewPublisherInput = false;

  constructor(
    private mangaService: MangaService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.loadFormats();
    this.loadPublishers();

    if (this.editingManga) {
      this.manga = {
        id: this.editingManga.id,
        name: this.editingManga.name,
        volumes: this.editingManga.volumes,
        formatId: this.editingManga.formatId,
        publisherId: this.editingManga.publisherId
      };
    } else {
      this.resetForm();
    }
  }

  loadFormats(): void {
    this.apiService.get<Format[]>('/api/format').subscribe({
      next: (formats: Format[]) => this.formats = formats,
      error: (error: any) => console.error('Error loading formats', error)
    });
  }

  loadPublishers(): void {
    this.apiService.get<Publisher[]>('/api/publisher').subscribe({
      next: (publishers: Publisher[]) => this.publishers = publishers,
      error: (error: any) => console.error('Error loading publishers', error)
    });
  }

  resetForm(): void {
    this.manga = {
      name: '',
      volumes: null,
      formatId: this.formats.length > 0 ? this.formats[0].id : 1,
      publisherId: this.publishers.length > 0 ? this.publishers[0].id : 1
    };
    this.newFormatName = '';
    this.newPublisherName = '';
    this.showNewFormatInput = false;
    this.showNewPublisherInput = false;
  }

  createFormat(): void {
    if (!this.newFormatName.trim()) return;

    const newFormat: Format = {
      id: 0,
      name: this.newFormatName.trim()
    };

    this.apiService.post<Format>('/api/format', newFormat).subscribe({
      next: (format: Format) => {
        this.formats.push(format);
        this.manga.formatId = format.id;
        this.newFormatName = '';
        this.showNewFormatInput = false;
      },
      error: (error: any) => console.error('Error creating format', error)
    });
  }

  createPublisher(): void {
    if (!this.newPublisherName.trim()) return;

    const newPublisher: Publisher = {
      id: 0,
      name: this.newPublisherName.trim()
    };

    this.apiService.post<Publisher>('/api/publisher', newPublisher).subscribe({
      next: (publisher: Publisher) => {
        this.publishers.push(publisher);
        this.manga.publisherId = publisher.id;
        this.newPublisherName = '';
        this.showNewPublisherInput = false;
      },
      error: (error: any) => console.error('Error creating publisher', error)
    });
  }

  onSubmit(): void {
    if (!this.manga.name.trim()) return;

    this.mangaService.createOrUpdateManga(this.manga).subscribe({
      next: () => {
        this.success.emit();
        this.onClose();
      },
      error: (error: any) => console.error('Error saving manga', error)
    });
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }
}
