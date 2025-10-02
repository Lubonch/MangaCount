# Data Models & API Integration Guide

## Overview
This document defines all data models, API endpoint specifications, and HTTP client implementation patterns for the Angular migration of MangaCount. It ensures type safety and consistent API integration across the application.

## Table of Contents
1. [TypeScript Models](#typescript-models)
2. [API Endpoint Specifications](#api-endpoint-specifications)
3. [HTTP Client Service Implementation](#http-client-service-implementation)
4. [Error Handling](#error-handling)
5. [Data Transfer Objects (DTOs)](#data-transfer-objects-dtos)
6. [API Response Types](#api-response-types)
7. [Validation Schemas](#validation-schemas)

---

## TypeScript Models

### Core Entity Models

#### Profile Model
```typescript
// src/app/shared/models/profile.model.ts
export interface Profile {
  id: number;
  name: string;
  profilePicture?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateProfileDto {
  name: string;
  profilePicture?: File | string;
}

export interface UpdateProfileDto {
  id: number;
  name?: string;
  profilePicture?: File | string;
}
```

#### Manga Model
```typescript
// src/app/shared/models/manga.model.ts
export interface Manga {
  id: number;
  name: string;
  volumes?: number;
  formatId: number;
  format?: Format;
  publisherId: number;
  publisher?: Publisher;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateMangaDto {
  name: string;
  volumes?: number;
  formatId: number;
  publisherId: number;
}

export interface UpdateMangaDto {
  id: number;
  name?: string;
  volumes?: number;
  formatId?: number;
  publisherId?: number;
}
```

#### Entry Model
```typescript
// src/app/shared/models/entry.model.ts
export interface Entry {
  id: number;
  mangaId: number;
  manga: Manga;
  profileId: number;
  profile?: Profile;
  quantity: number;
  pending?: string;
  priority: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateEntryDto {
  mangaId: number;
  profileId: number;
  quantity: number;
  pending?: string;
  priority?: boolean;
}

export interface UpdateEntryDto {
  id: number;
  quantity?: number;
  pending?: string;
  priority?: boolean;
}

// For quick volume updates
export interface QuickVolumeUpdateDto {
  id: number;
  quantity: number;
}
```

#### Publisher Model
```typescript
// src/app/shared/models/publisher.model.ts
export interface Publisher {
  id: number;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatePublisherDto {
  name: string;
}

export interface PublisherCount {
  id: number;
  name: string;
  count: number;
}
```

#### Format Model
```typescript
// src/app/shared/models/format.model.ts
export interface Format {
  id: number;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateFormatDto {
  name: string;
}

export interface FormatCount {
  id: number;
  name: string;
  count: number;
}
```

### Utility and UI Models

#### Collection View Models
```typescript
// src/app/shared/models/collection.model.ts
export type ViewMode = 'table' | 'cards' | 'compact';
export type SortBy = 'name' | 'completion' | 'quantity' | 'priority' | 'publisher' | 'format';
export type FilterBy = 'all' | 'complete' | 'incomplete' | 'priority-incomplete' | 'priority' | 'pending';
export type EntryStatus = 'complete' | 'priority-incomplete' | 'incomplete';

export interface CollectionFilter {
  status: FilterBy;
  publisher: string; // 'all' or publisher ID
  format: string;    // 'all' or format ID
}

export interface CollectionSort {
  by: SortBy;
  direction: 'asc' | 'desc';
}

export interface StatusCounts {
  complete: number;
  incomplete: number;
  priorityIncomplete: number;
  total: number;
}

export interface CollectionStats {
  totalEntries: number;
  totalVolumes: number;
  completeSeries: number;
  incompleteSeries: number;
  prioritySeries: number;
}
```

#### Import/Export Models
```typescript
// src/app/shared/models/import-export.model.ts
export interface ImportResult {
  success: boolean;
  message: string;
  importedCount: number;
  errorCount: number;
  errors?: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  value: string;
  error: string;
}

export interface TSVRow {
  name: string;
  quantity: string;
  totalVolumes: string;
  pending: string;
  priority: string;
}

export interface ExportData {
  profiles: Profile[];
  entries: Entry[];
  mangas: Manga[];
  publishers: Publisher[];
  formats: Format[];
  exportedAt: Date;
}
```

#### System Models
```typescript
// src/app/shared/models/system.model.ts
export interface DatabaseStatistics {
  totalManga: number;
  totalEntries: number;
  totalProfiles: number;
  totalFormats: number;
  totalPublishers: number;
  lastUpdated: Date;
}

export interface LoadBearingStatus {
  status: 'stable' | 'unstable' | 'critical';
  structuralIntegrity: string;
  serverImageExists: boolean;
  clientImageExists: boolean;
  lastChecked: Date;
}

export interface NukeConfirmation {
  isConfirmed: boolean;
  confirmationText: string;
  timestamp: Date;
}
```

#### Notification Models
```typescript
// src/app/shared/models/notification.model.ts
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  duration: number;
  timestamp: Date;
  dismissible?: boolean;
}

export interface ToastConfig {
  type: NotificationType;
  message: string;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}
```

---

## API Endpoint Specifications

### Base Configuration
```typescript
// src/app/core/config/api.config.ts
export const API_CONFIG = {
  baseUrl: '/api',
  endpoints: {
    profiles: '/profile',
    entries: '/entry',
    manga: '/manga',
    publishers: '/publisher',
    formats: '/format',
    database: '/database',
    loadBearing: '/loadbearing'
  },
  timeouts: {
    default: 30000,
    upload: 120000,
    longRunning: 300000
  }
} as const;
```

### Profile Endpoints
```typescript
// Profile API endpoints
export const PROFILE_ENDPOINTS = {
  // GET /api/profile - Get all profiles
  getAll: `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.profiles}`,
  
  // POST /api/profile - Create new profile
  create: `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.profiles}`,
  
  // PUT /api/profile/{id} - Update profile
  update: (id: number) => `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.profiles}/${id}`,
  
  // DELETE /api/profile/{id} - Delete profile
  delete: (id: number) => `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.profiles}/${id}`,
  
  // POST /api/profile/{id}/image - Upload profile image
  uploadImage: (id: number) => `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.profiles}/${id}/image`
} as const;
```

### Entry Endpoints
```typescript
// Entry API endpoints
export const ENTRY_ENDPOINTS = {
  // GET /api/entry?profileId={id} - Get entries for profile
  getByProfile: (profileId: number) => 
    `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.entries}?profileId=${profileId}`,
  
  // POST /api/entry - Create/Update entry
  save: `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.entries}`,
  
  // PUT /api/entry/{id}/quantity - Quick volume update
  updateQuantity: (id: number) => 
    `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.entries}/${id}/quantity`,
  
  // POST /api/entry/import/{profileId} - Import TSV file
  import: (profileId: number) => 
    `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.entries}/import/${profileId}`,
  
  // GET /api/entry/export/{profileId} - Export entries
  export: (profileId: number) => 
    `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.entries}/export/${profileId}`,
  
  // GET /api/entry/filters/publishers?profileId={id} - Get publishers for profile
  publisherFilter: (profileId: number) => 
    `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.entries}/filters/publishers?profileId=${profileId}`,
  
  // GET /api/entry/filters/formats?profileId={id} - Get formats for profile
  formatFilter: (profileId: number) => 
    `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.entries}/filters/formats?profileId=${profileId}`,
  
  // DELETE /api/entry/{id} - Delete entry
  delete: (id: number) => `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.entries}/${id}`
} as const;
```

### Manga Endpoints
```typescript
// Manga API endpoints
export const MANGA_ENDPOINTS = {
  // GET /api/manga - Get all manga
  getAll: `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.manga}`,
  
  // GET /api/manga/{id} - Get manga by ID
  getById: (id: number) => `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.manga}/${id}`,
  
  // POST /api/manga - Create new manga
  create: `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.manga}`,
  
  // PUT /api/manga/{id} - Update manga
  update: (id: number) => `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.manga}/${id}`,
  
  // DELETE /api/manga/{id} - Delete manga
  delete: (id: number) => `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.manga}/${id}`,
  
  // GET /api/manga/search?q={query} - Search manga
  search: (query: string) => 
    `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.manga}/search?q=${encodeURIComponent(query)}`
} as const;
```

### Publisher & Format Endpoints
```typescript
// Publisher API endpoints
export const PUBLISHER_ENDPOINTS = {
  getAll: `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.publishers}`,
  create: `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.publishers}`,
  update: (id: number) => `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.publishers}/${id}`,
  delete: (id: number) => `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.publishers}/${id}`
} as const;

// Format API endpoints
export const FORMAT_ENDPOINTS = {
  getAll: `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.formats}`,
  create: `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.formats}`,
  update: (id: number) => `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.formats}/${id}`,
  delete: (id: number) => `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.formats}/${id}`
} as const;
```

### System Endpoints
```typescript
// System API endpoints
export const SYSTEM_ENDPOINTS = {
  // GET /api/database/statistics - Get database statistics
  statistics: `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.database}/statistics`,
  
  // POST /api/database/nuke - Clear all data
  nuke: `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.database}/nuke`,
  
  // GET /api/loadbearing/status - Get infrastructure status
  loadBearingStatus: `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.loadBearing}/status`,
  
  // GET /api/health - Health check
  health: `${API_CONFIG.baseUrl}/health`
} as const;
```

---

## HTTP Client Service Implementation

### Base HTTP Service
```typescript
// src/app/core/services/base-http.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';
import { API_CONFIG } from '../config/api.config';

export interface HttpOptions {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | string[] };
  timeout?: number;
  retries?: number;
}

@Injectable({
  providedIn: 'root'
})
export class BaseHttpService {
  constructor(private http: HttpClient) {}

  protected get<T>(url: string, options?: HttpOptions): Observable<T> {
    return this.http.get<T>(url, this.buildHttpOptions(options))
      .pipe(
        timeout(options?.timeout || API_CONFIG.timeouts.default),
        retry(options?.retries || 1),
        catchError(this.handleError)
      );
  }

  protected post<T>(url: string, body: any, options?: HttpOptions): Observable<T> {
    return this.http.post<T>(url, body, this.buildHttpOptions(options))
      .pipe(
        timeout(options?.timeout || API_CONFIG.timeouts.default),
        retry(options?.retries || 0),
        catchError(this.handleError)
      );
  }

  protected put<T>(url: string, body: any, options?: HttpOptions): Observable<T> {
    return this.http.put<T>(url, body, this.buildHttpOptions(options))
      .pipe(
        timeout(options?.timeout || API_CONFIG.timeouts.default),
        retry(options?.retries || 0),
        catchError(this.handleError)
      );
  }

  protected delete<T>(url: string, options?: HttpOptions): Observable<T> {
    return this.http.delete<T>(url, this.buildHttpOptions(options))
      .pipe(
        timeout(options?.timeout || API_CONFIG.timeouts.default),
        retry(options?.retries || 1),
        catchError(this.handleError)
      );
  }

  protected upload<T>(url: string, formData: FormData, options?: HttpOptions): Observable<T> {
    const uploadOptions = {
      ...this.buildHttpOptions(options),
      reportProgress: true,
      observe: 'events' as 'events'
    };

    return this.http.post<T>(url, formData, uploadOptions)
      .pipe(
        timeout(options?.timeout || API_CONFIG.timeouts.upload),
        catchError(this.handleError)
      );
  }

  private buildHttpOptions(options?: HttpOptions): any {
    return {
      headers: options?.headers,
      params: options?.params,
      observe: 'body',
      responseType: 'json'
    };
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Bad Request';
          break;
        case 401:
          errorMessage = 'Unauthorized access';
          break;
        case 403:
          errorMessage = 'Access forbidden';
          break;
        case 404:
          errorMessage = 'Resource not found';
          break;
        case 409:
          errorMessage = error.error?.message || 'Conflict with existing data';
          break;
        case 422:
          errorMessage = error.error?.message || 'Validation failed';
          break;
        case 500:
          errorMessage = 'Internal server error';
          break;
        default:
          errorMessage = `Server Error: ${error.status} - ${error.message}`;
      }
    }

    console.error('HTTP Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
```

### Data Service Implementation
```typescript
// src/app/core/services/data.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { 
  Profile, CreateProfileDto, UpdateProfileDto,
  Entry, CreateEntryDto, UpdateEntryDto, QuickVolumeUpdateDto,
  Manga, CreateMangaDto, UpdateMangaDto,
  Publisher, CreatePublisherDto, PublisherCount,
  Format, CreateFormatDto, FormatCount,
  ImportResult, DatabaseStatistics, LoadBearingStatus, NukeConfirmation
} from '../../shared/models';
import {
  PROFILE_ENDPOINTS, ENTRY_ENDPOINTS, MANGA_ENDPOINTS,
  PUBLISHER_ENDPOINTS, FORMAT_ENDPOINTS, SYSTEM_ENDPOINTS
} from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class DataService extends BaseHttpService {
  
  // Profile methods
  getProfiles(): Observable<Profile[]> {
    return this.get<Profile[]>(PROFILE_ENDPOINTS.getAll);
  }

  createProfile(profile: CreateProfileDto): Observable<Profile> {
    return this.post<Profile>(PROFILE_ENDPOINTS.create, profile);
  }

  updateProfile(profile: UpdateProfileDto): Observable<Profile> {
    return this.put<Profile>(PROFILE_ENDPOINTS.update(profile.id), profile);
  }

  deleteProfile(id: number): Observable<void> {
    return this.delete<void>(PROFILE_ENDPOINTS.delete(id));
  }

  uploadProfileImage(profileId: number, imageFile: File): Observable<Profile> {
    const formData = new FormData();
    formData.append('image', imageFile);
    return this.upload<Profile>(PROFILE_ENDPOINTS.uploadImage(profileId), formData);
  }

  // Entry methods
  getEntries(profileId: number): Observable<Entry[]> {
    return this.get<Entry[]>(ENTRY_ENDPOINTS.getByProfile(profileId));
  }

  saveEntry(entry: CreateEntryDto | UpdateEntryDto): Observable<Entry> {
    return this.post<Entry>(ENTRY_ENDPOINTS.save, entry);
  }

  updateEntryQuantity(entryId: number, quantity: number): Observable<Entry> {
    const updateData: QuickVolumeUpdateDto = { id: entryId, quantity };
    return this.put<Entry>(ENTRY_ENDPOINTS.updateQuantity(entryId), updateData);
  }

  deleteEntry(id: number): Observable<void> {
    return this.delete<void>(ENTRY_ENDPOINTS.delete(id));
  }

  importEntries(file: File, profileId: number): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.upload<ImportResult>(
      ENTRY_ENDPOINTS.import(profileId), 
      formData, 
      { timeout: API_CONFIG.timeouts.upload }
    );
  }

  exportEntries(profileId: number): Observable<Blob> {
    return this.get<Blob>(ENTRY_ENDPOINTS.export(profileId));
  }

  getPublishersForProfile(profileId: number): Observable<PublisherCount[]> {
    return this.get<PublisherCount[]>(ENTRY_ENDPOINTS.publisherFilter(profileId));
  }

  getFormatsForProfile(profileId: number): Observable<FormatCount[]> {
    return this.get<FormatCount[]>(ENTRY_ENDPOINTS.formatFilter(profileId));
  }

  // Manga methods
  getMangas(): Observable<Manga[]> {
    return this.get<Manga[]>(MANGA_ENDPOINTS.getAll);
  }

  getMangaById(id: number): Observable<Manga> {
    return this.get<Manga>(MANGA_ENDPOINTS.getById(id));
  }

  createManga(manga: CreateMangaDto): Observable<Manga> {
    return this.post<Manga>(MANGA_ENDPOINTS.create, manga);
  }

  updateManga(manga: UpdateMangaDto): Observable<Manga> {
    return this.put<Manga>(MANGA_ENDPOINTS.update(manga.id), manga);
  }

  deleteManga(id: number): Observable<void> {
    return this.delete<void>(MANGA_ENDPOINTS.delete(id));
  }

  searchManga(query: string): Observable<Manga[]> {
    return this.get<Manga[]>(MANGA_ENDPOINTS.search(query));
  }

  // Publisher methods
  getPublishers(): Observable<Publisher[]> {
    return this.get<Publisher[]>(PUBLISHER_ENDPOINTS.getAll);
  }

  createPublisher(publisher: CreatePublisherDto): Observable<Publisher> {
    return this.post<Publisher>(PUBLISHER_ENDPOINTS.create, publisher);
  }

  updatePublisher(id: number, publisher: CreatePublisherDto): Observable<Publisher> {
    return this.put<Publisher>(PUBLISHER_ENDPOINTS.update(id), publisher);
  }

  deletePublisher(id: number): Observable<void> {
    return this.delete<void>(PUBLISHER_ENDPOINTS.delete(id));
  }

  // Format methods
  getFormats(): Observable<Format[]> {
    return this.get<Format[]>(FORMAT_ENDPOINTS.getAll);
  }

  createFormat(format: CreateFormatDto): Observable<Format> {
    return this.post<Format>(FORMAT_ENDPOINTS.create, format);
  }

  updateFormat(id: number, format: CreateFormatDto): Observable<Format> {
    return this.put<Format>(FORMAT_ENDPOINTS.update(id), format);
  }

  deleteFormat(id: number): Observable<void> {
    return this.delete<void>(FORMAT_ENDPOINTS.delete(id));
  }

  // System methods
  getDatabaseStatistics(): Observable<DatabaseStatistics> {
    return this.get<DatabaseStatistics>(SYSTEM_ENDPOINTS.statistics);
  }

  nukeDatabase(confirmation: NukeConfirmation): Observable<void> {
    return this.post<void>(
      SYSTEM_ENDPOINTS.nuke, 
      confirmation, 
      { timeout: API_CONFIG.timeouts.longRunning }
    );
  }

  getLoadBearingStatus(): Observable<LoadBearingStatus> {
    return this.get<LoadBearingStatus>(SYSTEM_ENDPOINTS.loadBearingStatus);
  }

  healthCheck(): Observable<{ status: string; timestamp: Date }> {
    return this.get<{ status: string; timestamp: Date }>(SYSTEM_ENDPOINTS.health);
  }
}
```

---

## Error Handling

### HTTP Error Interceptor
```typescript
// src/app/core/interceptors/error.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private notificationService: NotificationService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Log error for debugging
        console.error('HTTP Error Intercepted:', error);

        // Handle specific error cases
        switch (error.status) {
          case 400:
            this.notificationService.showError(
              error.error?.message || 'Invalid request. Please check your input.'
            );
            break;
          case 401:
            this.notificationService.showError('Authentication required.');
            break;
          case 403:
            this.notificationService.showError('You do not have permission to perform this action.');
            break;
          case 404:
            this.notificationService.showError('The requested resource was not found.');
            break;
          case 409:
            this.notificationService.showError(
              error.error?.message || 'This action conflicts with existing data.'
            );
            break;
          case 422:
            this.notificationService.showError(
              error.error?.message || 'Validation failed. Please check your input.'
            );
            break;
          case 500:
            this.notificationService.showError(
              'Server error occurred. Please try again later.'
            );
            break;
          default:
            if (error.status >= 500) {
              this.notificationService.showError(
                'Server error occurred. Please try again later.'
              );
            } else if (error.status === 0) {
              this.notificationService.showError(
                'Network error. Please check your connection.'
              );
            }
        }

        // Re-throw the error for component-level handling
        return throwError(() => error);
      })
    );
  }
}
```

### Loading Interceptor
```typescript
// src/app/core/interceptors/loading.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private loadingService: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    // Skip loading indicator for certain endpoints
    const skipLoading = req.headers.has('X-Skip-Loading');
    
    if (!skipLoading) {
      this.loadingService.startLoading();
    }

    return next.handle(req).pipe(
      finalize(() => {
        if (!skipLoading) {
          this.loadingService.stopLoading();
        }
      })
    );
  }
}
```

---

## Data Transfer Objects (DTOs)

### Validation DTOs
```typescript
// src/app/shared/models/validation.model.ts
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Form validation DTOs
export interface ProfileFormData {
  name: string;
  profilePicture?: File;
}

export interface EntryFormData {
  mangaId: number;
  quantity: number;
  pending?: string;
  priority: boolean;
}

export interface MangaFormData {
  name: string;
  volumes?: number;
  formatId: number;
  publisherId: number;
}
```

### File Upload DTOs
```typescript
// src/app/shared/models/upload.model.ts
export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  progress?: FileUploadProgress;
}

export interface ImageUploadConfig {
  maxSize: number; // in bytes
  allowedTypes: string[]; // MIME types
  maxWidth?: number;
  maxHeight?: number;
}

export const IMAGE_UPLOAD_CONFIG: ImageUploadConfig = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxWidth: 800,
  maxHeight: 800
};
```

---

## API Response Types

### Standard Response Wrappers
```typescript
// src/app/shared/models/api-response.model.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  timestamp: Date;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchResponse<T = any> {
  results: T[];
  query: string;
  totalResults: number;
  searchTime: number;
}
```

---

## Validation Schemas

### Client-Side Validation
```typescript
// src/app/shared/validators/custom-validators.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {
  static profileName(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      
      if (value.length < 2) {
        return { profileName: { message: 'Profile name must be at least 2 characters long' } };
      }
      
      if (value.length > 50) {
        return { profileName: { message: 'Profile name cannot exceed 50 characters' } };
      }
      
      if (!/^[a-zA-Z0-9\s-_]+$/.test(value)) {
        return { profileName: { message: 'Profile name contains invalid characters' } };
      }
      
      return null;
    };
  }

  static mangaName(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      
      if (value.length < 1) {
        return { mangaName: { message: 'Manga name is required' } };
      }
      
      if (value.length > 200) {
        return { mangaName: { message: 'Manga name cannot exceed 200 characters' } };
      }
      
      return null;
    };
  }

  static positiveInteger(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      
      const numberValue = Number(value);
      if (!Number.isInteger(numberValue) || numberValue <= 0) {
        return { positiveInteger: { message: 'Value must be a positive integer' } };
      }
      
      return null;
    };
  }

  static volumeRange(maxVolumes?: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      
      const numberValue = Number(value);
      if (!Number.isInteger(numberValue) || numberValue < 0) {
        return { volumeRange: { message: 'Volume count must be zero or positive' } };
      }
      
      if (maxVolumes && numberValue > maxVolumes) {
        return { volumeRange: { message: `Volume count cannot exceed ${maxVolumes}` } };
      }
      
      return null;
    };
  }

  static fileSize(maxSizeBytes: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const file = control.value as File;
      if (!file) return null;
      
      if (file.size > maxSizeBytes) {
        const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
        return { fileSize: { message: `File size cannot exceed ${maxSizeMB}MB` } };
      }
      
      return null;
    };
  }

  static fileType(allowedTypes: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const file = control.value as File;
      if (!file) return null;
      
      if (!allowedTypes.includes(file.type)) {
        return { fileType: { message: `File type ${file.type} is not allowed` } };
      }
      
      return null;
    };
  }
}
```

This comprehensive data models and API integration guide provides all the TypeScript interfaces, service implementations, and validation schemas needed for the Angular migration while ensuring type safety and robust error handling throughout the application.