import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Manga, CreateMangaRequest, UpdateMangaRequest } from '../models/manga.models';

export interface MangaDialogData {
  manga?: Manga;
  profileId: number;
  mode: 'add' | 'edit';
}

@Component({
  selector: 'app-manga-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'add' ? 'Add Manga' : 'Edit Manga' }}</h2>
    
    <mat-dialog-content class="dialog-content">
      <form [formGroup]="mangaForm" class="manga-form">
        <mat-form-field appearance="fill">
          <mat-label>Title *</mat-label>
          <input matInput formControlName="title" placeholder="Enter manga title">
          <mat-error *ngIf="mangaForm.get('title')?.invalid && mangaForm.get('title')?.touched">
            Title is required
          </mat-error>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="fill">
            <mat-label>Purchased Volumes</mat-label>
            <input matInput type="number" formControlName="purchased" min="0">
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Total Volumes</mat-label>
            <input matInput formControlName="total" placeholder="e.g., 10 or ??">
          </mat-form-field>
        </div>

        <mat-form-field appearance="fill">
          <mat-label>Pending/Missing Volumes</mat-label>
          <input matInput formControlName="pending" placeholder="e.g., 2,4-6,8">
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="fill">
            <mat-label>Format</mat-label>
            <mat-select formControlName="format">
              <mat-option value="Tankoubon">Tankoubon</mat-option>
              <mat-option value="B6">B6</mat-option>
              <mat-option value="A5">A5</mat-option>
              <mat-option value="A5 Color">A5 Color</mat-option>
              <mat-option value="Unknown">Unknown</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Publisher</mat-label>
            <input matInput formControlName="publisher" placeholder="e.g., Ivrea, Panini">
          </mat-form-field>
        </div>

        <mat-form-field appearance="fill">
          <mat-label>Image URL (optional)</mat-label>
          <input matInput formControlName="imageUrl" placeholder="https://example.com/cover.jpg">
        </mat-form-field>

        <div class="checkbox-row">
          <mat-checkbox formControlName="complete">Series Complete</mat-checkbox>
          <mat-checkbox formControlName="priority">High Priority</mat-checkbox>
        </div>
      </form>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" 
              (click)="onSave()" 
              [disabled]="mangaForm.invalid">
        {{ data.mode === 'add' ? 'Add' : 'Update' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      width: 500px;
      max-width: 90vw;
    }
    
    .manga-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .form-row {
      display: flex;
      gap: 16px;
      
      mat-form-field {
        flex: 1;
      }
    }
    
    .checkbox-row {
      display: flex;
      gap: 24px;
      margin: 8px 0;
    }
    
    @media (max-width: 600px) {
      .form-row {
        flex-direction: column;
        gap: 8px;
      }
    }
  `]
})
export class MangaDialogComponent implements OnInit {
  mangaForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<MangaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MangaDialogData
  ) {
    this.mangaForm = this.fb.group({
      title: ['', Validators.required],
      purchased: [0, [Validators.min(0)]],
      total: [''],
      pending: [''],
      format: ['Unknown'],
      publisher: ['Unknown'],
      imageUrl: [''],
      complete: [false],
      priority: [false]
    });
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.manga) {
      this.mangaForm.patchValue({
        title: this.data.manga.title,
        purchased: this.data.manga.purchased,
        total: this.data.manga.total,
        pending: this.data.manga.pending,
        format: this.data.manga.format,
        publisher: this.data.manga.publisher,
        imageUrl: this.data.manga.imageUrl || '',
        complete: this.data.manga.complete,
        priority: this.data.manga.priority
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.mangaForm.valid) {
      const formValue = this.mangaForm.value;
      
      if (this.data.mode === 'add') {
        const request: CreateMangaRequest = {
          profileId: this.data.profileId,
          title: formValue.title,
          purchased: formValue.purchased,
          total: formValue.total,
          pending: formValue.pending || undefined,
          complete: formValue.complete,
          priority: formValue.priority,
          format: formValue.format || undefined,
          publisher: formValue.publisher || undefined,
          imageUrl: formValue.imageUrl || undefined
        };
        this.dialogRef.close(request);
      } else {
        const request: UpdateMangaRequest = {
          title: formValue.title,
          purchased: formValue.purchased,
          total: formValue.total,
          pending: formValue.pending || undefined,
          complete: formValue.complete,
          priority: formValue.priority,
          format: formValue.format || undefined,
          publisher: formValue.publisher || undefined,
          imageUrl: formValue.imageUrl || undefined
        };
        this.dialogRef.close(request);
      }
    }
  }
}