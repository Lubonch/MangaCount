import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Manga } from '../models/manga.models';
import { ImageService } from '../services/image.service';

@Component({
  selector: 'app-manga-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule
  ],
  template: `
    <mat-card class="manga-card">
      <div class="manga-image">
        <img
          [src]="imageUrl || imageService.generatePlaceholderDataUrl(manga.title)"
          [alt]="manga.title"
          (error)="onImageError($event)"
          class="cover-image"
          [class.loading]="imageLoading">
        <div class="image-loader" *ngIf="imageLoading">
          <mat-icon>image</mat-icon>
        </div>
        <div class="priority-badge" *ngIf="manga.priority">
          <mat-icon>priority_high</mat-icon>
        </div>
      </div>

      <mat-card-content class="manga-details">
        <h3 class="manga-title" [title]="manga.title">{{manga.title}}</h3>

        <div class="manga-info">
          <div class="volumes-info">
            <span class="purchased">{{manga.purchased}}</span>
            <span class="separator">/</span>
            <span class="total">{{manga.total}}</span>
            <span class="volumes-label">volumes</span>
          </div>

          <div class="progress-section" *ngIf="getProgressPercentage() !== null">
            <mat-progress-bar
              mode="determinate"
              [value]="getProgressPercentage()!"
              [color]="manga.complete ? 'primary' : 'accent'">
            </mat-progress-bar>
            <span class="progress-text">{{getProgressPercentage()}}%</span>
          </div>
        </div>

        <div class="manga-meta">
          <mat-chip-set>
            <mat-chip [class.complete]="manga.complete" [class.incomplete]="!manga.complete">
              {{manga.complete ? 'Complete' : 'Incomplete'}}
            </mat-chip>
            <mat-chip class="format-chip">{{manga.format}}</mat-chip>
            <mat-chip class="publisher-chip">{{manga.publisher}}</mat-chip>
          </mat-chip-set>
        </div>

        <div class="pending-info" *ngIf="manga.pending">
          <mat-icon class="pending-icon">info</mat-icon>
          <span class="pending-text">Missing: {{manga.pending}}</span>
        </div>
      </mat-card-content>

      <mat-card-actions class="manga-actions">
        <button mat-button (click)="onEdit()">
          <mat-icon>edit</mat-icon>
          Edit
        </button>
        <button mat-button color="warn" (click)="onDelete()">
          <mat-icon>delete</mat-icon>
          Delete
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styleUrls: ['./manga-card.component.scss']
})
export class MangaCardComponent implements OnInit {
  @Input() manga!: Manga;
  @Output() edit = new EventEmitter<Manga>();
  @Output() delete = new EventEmitter<Manga>();

  imageUrl: string = '';
  imageLoading: boolean = true;

  constructor(public imageService: ImageService) {}

  ngOnInit(): void {
    this.loadImage();
  }

  loadImage(): void {
    if (this.manga.imageUrl) {
      this.imageUrl = this.manga.imageUrl;
      this.imageLoading = false;
    } else {
      // Try to fetch image from API
      this.imageService.searchMangaImage(this.manga.title).subscribe({
        next: (url) => {
          this.imageUrl = url || this.imageService.generatePlaceholderDataUrl(this.manga.title);
          this.imageLoading = false;
        },
        error: () => {
          this.imageUrl = this.imageService.generatePlaceholderDataUrl(this.manga.title);
          this.imageLoading = false;
        }
      });
    }
  }

  getProgressPercentage(): number | null {
    const totalNum = parseInt(this.manga.total);
    if (isNaN(totalNum) || totalNum === 0) {
      return null;
    }
    return Math.round((this.manga.purchased / totalNum) * 100);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.imageService.generatePlaceholderDataUrl(this.manga.title);
    this.imageLoading = false;
  }

  onEdit(): void {
    this.edit.emit(this.manga);
  }

  onDelete(): void {
    this.delete.emit(this.manga);
  }
}
