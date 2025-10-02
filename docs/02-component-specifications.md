# Component Specifications for Angular Migration

## Overview
This document provides detailed specifications for each React component that needs to be migrated to Angular. Each component includes its props/inputs, state management, functionality, and styling requirements.

## Table of Contents
1. [App Component](#app-component)
2. [Sidebar Component](#sidebar-component)
3. [CollectionView Component](#collectionview-component)
4. [ProfileSelector Component](#profileselector-component)
5. [Modal Components](#modal-components)
6. [Utility Components](#utility-components)
7. [Context/Service Components](#contextservice-components)

---

## App Component

### Current Implementation: `App.jsx`
**Purpose**: Root application component managing global state and navigation flow

### Angular Equivalent: `AppComponent`

#### Inputs/Props
- None (root component)

#### State Management (to become Angular service)
```typescript
interface AppState {
  entries: Entry[];
  mangas: Manga[];
  profiles: Profile[];
  selectedProfile: Profile | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  appPhase: 'loading' | 'profile-selection' | 'main-app' | 'error';
  isChangingProfile: boolean;
  lastSelectedProfile: Profile | null;
}
```

#### Methods to Implement
```typescript
export class AppComponent {
  // Lifecycle methods
  ngOnInit(): void;
  
  // Data loading methods
  initializeApp(): Promise<void>;
  loadProfiles(): Promise<Profile[]>;
  loadData(isRefresh?: boolean): Promise<void>;
  loadEntries(profileId: number): Promise<void>;
  loadMangas(): Promise<void>;
  
  // Profile management
  handleProfileSelect(profile: Profile, saveSelection?: boolean): Promise<void>;
  handleBackToProfileSelection(): void;
  handleBackToCollection(): void;
  
  // Data refresh
  handleImportSuccess(): void;
}
```

#### Template Structure
```html
<div class="app" [attr.data-theme]="themeService.currentTheme">
  <!-- Loading State -->
  <app-loading-spinner 
    *ngIf="loading && appPhase === 'loading'"
    [fullScreen]="true"
    [size]="'large'"
    [message]="'Initializing Manga Collection App...'">
  </app-loading-spinner>

  <!-- Error State -->
  <div *ngIf="error || appPhase === 'error'" class="app-error">
    <h2>Oops! Something went wrong</h2>
    <p>{{ error }}</p>
    <button (click)="initializeApp()">Retry Loading</button>
  </div>

  <!-- Profile Selection Phase -->
  <app-load-bearing-check *ngIf="appPhase === 'profile-selection'">
    <div class="app">
      <div class="profile-selection-container">
        <app-profile-selector 
          (profileSelect)="handleProfileSelect($event)"
          [selectedProfileId]="selectedProfile?.id"
          [isChangingProfile]="isChangingProfile"
          [showBackButton]="isChangingProfile && !!lastSelectedProfile"
          (backToMain)="handleBackToCollection()"
          [lastSelectedProfile]="lastSelectedProfile">
        </app-profile-selector>
      </div>
    </div>
  </app-load-bearing-check>

  <!-- Main Application Phase -->
  <app-load-bearing-check *ngIf="appPhase === 'main-app'">
    <div class="app">
      <div class="app-container">
        <app-sidebar 
          [mangas]="mangas"
          [selectedProfile]="selectedProfile"
          (importSuccess)="handleImportSuccess()"
          (backToProfiles)="handleBackToProfileSelection()"
          [refreshing]="refreshing">
        </app-sidebar>
        
        <main class="main-content">
          <app-collection-view 
            [entries]="entries"
            [mangas]="mangas"
            [selectedProfile]="selectedProfile"
            [loading]="refreshing"
            (refresh)="loadData(true)">
          </app-collection-view>
        </main>
      </div>
    </div>
  </app-load-bearing-check>
</div>
```

#### Services Required
- `DataService` for API calls
- `ThemeService` for theme management
- `ProfileService` for profile management
- `NotificationService` for error handling

---

## Sidebar Component

### Current Implementation: `Sidebar.jsx`
**Purpose**: Navigation sidebar with quick actions, import functionality, and manga library

### Angular Equivalent: `SidebarComponent`

#### Inputs
```typescript
@Component({
  inputs: [
    'mangas: Manga[]',
    'selectedProfile: Profile | null',
    'refreshing: boolean'
  ],
  outputs: [
    'importSuccess: EventEmitter<void>',
    'backToProfiles: EventEmitter<void>'
  ]
})
```

#### State Management
```typescript
interface SidebarState {
  isImporting: boolean;
  importMessage: string;
  showAddEntry: boolean;
  showAddManga: boolean;
  showEditManga: boolean;
  showNukeModal: boolean;
  editingManga: Manga | null;
}
```

#### Methods
```typescript
export class SidebarComponent {
  // File handling
  handleFileImport(event: Event): Promise<void>;
  
  // Modal management
  handleAddSuccess(): void;
  handleEditManga(manga: Manga): void;
  handleNukeSuccess(): void;
}
```

#### Template Structure
```html
<aside class="sidebar">
  <!-- Header with profile info -->
  <div class="sidebar-header">
    <h2>??? Manga Count</h2>
    
    <div *ngIf="selectedProfile" class="current-profile-info">
      <div class="profile-display">
        <div class="profile-avatar-small">
          <img *ngIf="selectedProfile.profilePicture; else placeholder"
               [src]="selectedProfile.profilePicture"
               [alt]="selectedProfile.name"
               class="profile-image-small">
          <ng-template #placeholder>
            <div class="profile-placeholder-small">
              {{ selectedProfile.name.charAt(0).toUpperCase() }}
            </div>
          </ng-template>
        </div>
        <div class="profile-text">
          <span class="profile-name-small">{{ selectedProfile.name }}</span>
          <span class="profile-subtitle">Collection</span>
        </div>
      </div>
      <button class="change-profile-btn" 
              (click)="backToProfiles.emit()"
              title="Change profile">
        ??
      </button>
    </div>
  </div>

  <!-- Theme Section -->
  <div class="sidebar-section">
    <h3>Theme</h3>
    <app-theme-toggle></app-theme-toggle>
  </div>

  <!-- Quick Actions -->
  <div class="sidebar-section">
    <h3>Quick Actions</h3>
    <div class="quick-actions">
      <button class="action-button add-entry"
              (click)="showAddEntry = true"
              [disabled]="!selectedProfile">
        + Add Entry
      </button>
      <button class="action-button add-manga"
              (click)="showAddManga = true">
        + Add Manga
      </button>
    </div>
  </div>

  <!-- Import Section -->
  <div class="sidebar-section">
    <h3>Import Collection</h3>
    <div class="import-section">
      <input type="file"
             accept=".tsv"
             (change)="handleFileImport($event)"
             [disabled]="isImporting || !selectedProfile"
             class="file-input"
             id="tsv-import">
      <label for="tsv-import" class="file-input-label">
        {{ isImporting ? 'Importing...' : 'Choose TSV File' }}
      </label>
      <small *ngIf="!selectedProfile" class="import-note">
        Select a profile first
      </small>
      <p *ngIf="importMessage" 
         [class]="'import-message ' + getMessageClass(importMessage)">
        {{ importMessage }}
      </p>
      <div class="import-help">
        <small>
          Upload a TSV file with columns:<br>
          Name | Quantity | Total Volumes | Pending | | Priority
        </small>
      </div>
    </div>
  </div>

  <!-- Manga Library -->
  <div class="sidebar-section">
    <h3>Manga Library ({{ mangas.length }})</h3>
    <div class="manga-list">
      <p *ngIf="mangas.length === 0" class="empty-message">
        No manga in library
      </p>
      <div *ngFor="let manga of mangas" class="manga-item">
        <div class="manga-info">
          <div class="manga-name">{{ manga.name }}</div>
          <div *ngIf="manga.volumes" class="manga-volumes">
            {{ manga.volumes }} volumes
          </div>
        </div>
        <button class="edit-manga-btn-sidebar"
                (click)="handleEditManga(manga)"
                title="Edit manga info">
          ??
        </button>
      </div>
    </div>
  </div>

  <!-- Danger Zone -->
  <div class="sidebar-section danger-zone">
    <h3>?? Danger Zone</h3>
    <div class="danger-actions">
      <button class="danger-button nuke-button"
              (click)="showNukeModal = true"
              title="Clear all data from database">
        ?? Nuclear Option
      </button>
      <small class="danger-warning">
        This will permanently delete ALL data!
      </small>
    </div>
  </div>
</aside>

<!-- Modals -->
<app-add-entry-modal
  [isOpen]="showAddEntry"
  (close)="showAddEntry = false"
  [mangas]="mangas"
  [selectedProfile]="selectedProfile"
  (success)="handleAddSuccess()">
</app-add-entry-modal>

<app-add-manga-modal
  [isOpen]="showAddManga"
  (close)="showAddManga = false"
  (success)="handleAddSuccess()">
</app-add-manga-modal>

<app-add-manga-modal
  [isOpen]="showEditManga"
  (close)="showEditManga = false; editingManga = null"
  (success)="handleAddSuccess()"
  [editManga]="editingManga">
</app-add-manga-modal>

<app-nuke-data-modal
  [isOpen]="showNukeModal"
  (close)="showNukeModal = false"
  (success)="handleNukeSuccess()">
</app-nuke-data-modal>
```

---

## CollectionView Component

### Current Implementation: `CollectionView.jsx`
**Purpose**: Main content area displaying manga collection with filtering, sorting, and multiple view modes

### Angular Equivalent: `CollectionViewComponent`

#### Inputs
```typescript
@Component({
  inputs: [
    'entries: Entry[]',
    'loading: boolean',
    'mangas: Manga[]',
    'selectedProfile: Profile | null'
  ],
  outputs: [
    'refresh: EventEmitter<void>'
  ]
})
```

#### State Management
```typescript
interface CollectionViewState {
  filter: string;
  sortBy: string;
  viewMode: 'cards' | 'table' | 'compact';
  publisherFilter: string;
  formatFilter: string;
  availablePublishers: Publisher[];
  availableFormats: Format[];
  filtersLoading: boolean;
  showEditEntry: boolean;
  showEditManga: boolean;
  editingEntry: Entry | null;
  editingManga: Manga | null;
}
```

#### Key Methods
```typescript
export class CollectionViewComponent {
  // Filtering and sorting
  getFilteredEntries(): Entry[];
  getStatusCounts(): StatusCounts;
  getCompletionPercentage(entry: Entry): number | null;
  getEntryStatus(entry: Entry): 'complete' | 'priority-incomplete' | 'incomplete';
  
  // Data loading
  loadFilterOptions(): Promise<void>;
  
  // Edit handling
  handleEditEntry(entry: Entry): void;
  handleEditManga(manga: Manga): void;
  handleQuickVolumeUpdate(entry: Entry, newQuantity: number): Promise<void>;
  handleEditSuccess(): void;
  
  // Filter management
  clearAllFilters(): void;
  
  // View rendering
  renderTableView(): void;
  renderCompactView(): void;
  renderCardsView(): void;
  renderSkeleton(): void;
}
```

#### Template Structure (Key Sections)
```html
<div class="collection-view">
  <!-- Collection Header -->
  <div class="collection-header">
    <div class="header-content">
      <h1>My Manga Collection</h1>
      <button *ngIf="refresh" 
              class="refresh-button"
              (click)="refresh.emit()"
              [disabled]="loading"
              title="Refresh collection">
        <app-loading-spinner *ngIf="loading; else refreshIcon" 
                            [size]="'small'" 
                            [showMessage]="false">
        </app-loading-spinner>
        <ng-template #refreshIcon>??</ng-template>
      </button>
    </div>
    
    <p class="collection-stats">
      {{ entries.length }} total entries • 
      {{ getFilteredEntries().length }} shown • 
      {{ getTotalVolumes() }} volumes total
    </p>
    
    <div class="status-summary">
      <span class="status-count complete">
        <div class="status-dot complete"></div>
        Complete: {{ getStatusCounts().complete }}
      </span>
      <span class="status-count priority-incomplete">
        <div class="status-dot priority-incomplete"></div>
        Priority: {{ getStatusCounts().priorityIncomplete }}
      </span>
      <span class="status-count incomplete">
        <div class="status-dot incomplete"></div>
        Incomplete: {{ getStatusCounts().incomplete }}
      </span>
    </div>
  </div>

  <!-- Collection Controls -->
  <div class="collection-controls">
    <div class="filters-row">
      <!-- Publisher Filter -->
      <div class="filter-group">
        <label>?? Publisher:</label>
        <select [(ngModel)]="publisherFilter" 
                [disabled]="loading || filtersLoading">
          <option value="all">All Publishers</option>
          <option *ngFor="let publisher of availablePublishers" 
                  [value]="publisher.id">
            {{ publisher.name }} ({{ publisher.count }})
          </option>
        </select>
      </div>

      <!-- Format Filter -->
      <div class="filter-group">
        <label>?? Format:</label>
        <select [(ngModel)]="formatFilter" 
                [disabled]="loading || filtersLoading">
          <option value="all">All Formats</option>
          <option *ngFor="let format of availableFormats" 
                  [value]="format.id">
            {{ format.name }} ({{ format.count }})
          </option>
        </select>
      </div>

      <!-- Status Filter -->
      <div class="filter-group">
        <label>?? Status:</label>
        <select [(ngModel)]="filter" [disabled]="loading">
          <option value="all">All Status ({{ entries.length }})</option>
          <option value="complete">? Complete</option>
          <option value="priority-incomplete">? Priority Incomplete</option>
          <option value="incomplete">? Incomplete</option>
          <option value="priority">Priority Only</option>
          <option value="pending">With Pending</option>
        </select>
      </div>

      <!-- Clear Filters -->
      <div *ngIf="hasActiveFilters()" class="filter-group">
        <button class="clear-filters-btn"
                (click)="clearAllFilters()"
                title="Clear all filters">
          ??? Clear Filters
        </button>
      </div>
    </div>

    <div class="controls-row">
      <!-- View Controls -->
      <div class="view-controls">
        <label>View:</label>
        <select [(ngModel)]="viewMode" [disabled]="loading">
          <option value="table">?? Table</option>
          <option value="compact">?? Compact</option>
          <option value="cards">?? Cards</option>
        </select>
      </div>

      <!-- Sort Controls -->
      <div class="sort-controls">
        <label>Sort by:</label>
        <select [(ngModel)]="sortBy" [disabled]="loading">
          <option value="name">Name</option>
          <option value="completion">Completion %</option>
          <option value="quantity">Quantity</option>
          <option value="priority">Priority</option>
          <option value="publisher">Publisher</option>
          <option value="format">Format</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Collection Content -->
  <div class="collection-content">
    <!-- Loading State -->
    <div *ngIf="loading" class="skeleton-loading">
      <div *ngFor="let item of getSkeletonArray()" class="skeleton-item"></div>
    </div>

    <!-- Empty State -->
    <div *ngIf="!loading && getSortedEntries().length === 0" 
         class="empty-collection">
      <p>No entries found for the selected filters.</p>
      <button *ngIf="hasActiveFilters()" 
              (click)="clearAllFilters()" 
              class="reset-filter">
        Clear All Filters
      </button>
    </div>

    <!-- Table View -->
    <div *ngIf="!loading && viewMode === 'table' && getSortedEntries().length > 0"
         class="table-container">
      <!-- Table implementation -->
    </div>

    <!-- Compact View -->
    <div *ngIf="!loading && viewMode === 'compact' && getSortedEntries().length > 0"
         class="compact-grid">
      <!-- Compact cards implementation -->
    </div>

    <!-- Cards View -->
    <div *ngIf="!loading && viewMode === 'cards' && getSortedEntries().length > 0"
         class="entries-grid">
      <!-- Full cards implementation -->
    </div>
  </div>
</div>

<!-- Edit Modals -->
<app-add-entry-modal 
  [isOpen]="showEditEntry"
  (close)="showEditEntry = false; editingEntry = null"
  [mangas]="mangas"
  (success)="handleEditSuccess()"
  [editEntry]="editingEntry">
</app-add-entry-modal>

<app-add-manga-modal 
  [isOpen]="showEditManga"
  (close)="showEditManga = false; editingManga = null"
  (success)="handleEditSuccess()"
  [editManga]="editingManga">
</app-add-manga-modal>
```

---

## ProfileSelector Component

### Current Implementation: `ProfileSelector.jsx`
**Purpose**: Profile selection interface with avatar display and profile management

### Angular Equivalent: `ProfileSelectorComponent`

#### Inputs
```typescript
@Component({
  inputs: [
    'selectedProfileId: number | undefined',
    'isChangingProfile: boolean',
    'showBackButton: boolean',
    'lastSelectedProfile: Profile | null'
  ],
  outputs: [
    'profileSelect: EventEmitter<Profile>',
    'backToMain: EventEmitter<void>'
  ]
})
```

#### State Management
```typescript
interface ProfileSelectorState {
  profiles: Profile[];
  loading: boolean;
  showAddProfile: boolean;
  showEditProfile: boolean;
  editingProfile: Profile | null;
  error: string | null;
}
```

#### Methods
```typescript
export class ProfileSelectorComponent {
  ngOnInit(): void;
  loadProfiles(): Promise<void>;
  handleProfileSelect(profile: Profile): void;
  handleProfileCreated(): void;
  handleEditProfile(event: Event, profile: Profile): void;
  handleProfileUpdated(): void;
  handleDeleteProfile(event: Event, profileId: number): Promise<void>;
  handleImageError(event: Event): void;
  getImageUrl(profilePicture: string): string | null;
}
```

#### Template Structure
```html
<div class="profile-selector-fullscreen">
  <!-- Back Button -->
  <button *ngIf="showBackButton && lastSelectedProfile" 
          class="back-to-collection-btn"
          (click)="backToMain.emit()"
          [title]="'Back to ' + lastSelectedProfile.name + '\'s collection'">
    ? Back to {{ lastSelectedProfile.name }}'s Collection
  </button>

  <!-- Loading State -->
  <div *ngIf="loading" class="profile-selector-content">
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading profiles...</p>
    </div>
  </div>

  <!-- Error State -->
  <div *ngIf="error" class="profile-selector-content">
    <div class="error-container">
      <h2>?? Error Loading Profiles</h2>
      <p>{{ error }}</p>
      <button (click)="loadProfiles()" class="retry-btn">
        Try Again
      </button>
    </div>
  </div>

  <!-- Main Content -->
  <div *ngIf="!loading && !error" class="profile-selector-content">
    <div class="profile-selector-header">
      <h1 class="main-title">Choose whose manga collection to explore</h1>
    </div>

    <div class="profiles-container">
      <div class="profiles-circle-grid">
        <!-- Profile Circles -->
        <div *ngFor="let profile of profiles" 
             class="profile-circle"
             [class.selected]="selectedProfileId === profile.id">
          
          <div class="profile-circle-avatar"
               (click)="handleProfileSelect(profile)">
            <!-- Placeholder -->
            <div class="profile-circle-placeholder">
              {{ profile.name.charAt(0).toUpperCase() }}
            </div>
            
            <!-- Profile Image -->
            <img *ngIf="getImageUrl(profile.profilePicture)" 
                 [src]="getImageUrl(profile.profilePicture)"
                 [alt]="profile.name"
                 class="profile-circle-image"
                 (error)="handleImageError($event)"
                 (load)="onImageLoad($event)">
          </div>
          
          <span class="profile-circle-name"
                (click)="handleProfileSelect(profile)">
            {{ profile.name }}
          </span>

          <div class="profile-action-buttons">
            <button class="profile-action-btn edit-btn"
                    (click)="handleEditProfile($event, profile)"
                    title="Edit profile">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/>
              </svg>
            </button>

            <button *ngIf="profiles.length > 1"
                    class="profile-action-btn delete-btn"
                    (click)="handleDeleteProfile($event, profile.id)"
                    title="Delete profile">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Add New Profile Circle -->
        <div class="profile-circle add-profile-circle"
             (click)="showAddProfile = true">
          <div class="profile-circle-avatar">
            <div class="add-circle-icon">+</div>
          </div>
          <span class="profile-circle-name">Add New</span>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Modals -->
<app-add-profile-modal 
  [isOpen]="showAddProfile"
  (close)="showAddProfile = false"
  (success)="handleProfileCreated()">
</app-add-profile-modal>

<app-add-profile-modal 
  [isOpen]="showEditProfile"
  (close)="showEditProfile = false; editingProfile = null"
  (success)="handleProfileUpdated()"
  [editProfile]="editingProfile">
</app-add-profile-modal>
```

---

## Modal Components

### Common Modal Interface
All modals share similar patterns and should implement a common interface:

```typescript
interface BaseModal {
  isOpen: boolean;
  close: EventEmitter<void>;
  success: EventEmitter<void>;
}
```

### AddEntryModal Component
```typescript
@Component({
  inputs: [
    'isOpen: boolean',
    'mangas: Manga[]',
    'selectedProfile: Profile | null',
    'editEntry: Entry | null'
  ],
  outputs: [
    'close: EventEmitter<void>',
    'success: EventEmitter<void>'
  ]
})
```

### AddMangaModal Component
```typescript
@Component({
  inputs: [
    'isOpen: boolean',
    'editManga: Manga | null'
  ],
  outputs: [
    'close: EventEmitter<void>',
    'success: EventEmitter<void>'
  ]
})
```

### AddProfileModal Component
```typescript
@Component({
  inputs: [
    'isOpen: boolean',
    'editProfile: Profile | null'
  ],
  outputs: [
    'close: EventEmitter<void>',
    'success: EventEmitter<void>'
  ]
})
```

### NukeDataModal Component
```typescript
@Component({
  inputs: [
    'isOpen: boolean'
  ],
  outputs: [
    'close: EventEmitter<void>',
    'success: EventEmitter<void>'
  ]
})
```

---

## Utility Components

### LoadingSpinner Component
```typescript
@Component({
  inputs: [
    'size: "small" | "medium" | "large"',
    'message: string',
    'showMessage: boolean',
    'className: string',
    'fullScreen: boolean'
  ]
})
```

### ThemeToggle Component
```typescript
@Component({
  // No inputs - uses ThemeService
})
```

### LoadBearingCheck Component
```typescript
@Component({
  // Wrapper component for infrastructure checks
})
```

---

## Context/Service Components

### ThemeService (replaces ThemeContext)
```typescript
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkModeSubject = new BehaviorSubject<boolean>(true);
  isDarkMode$ = this.isDarkModeSubject.asObservable();
  
  get currentTheme(): string;
  toggleTheme(): void;
  setTheme(isDark: boolean): void;
}
```

### DataService
```typescript
@Injectable({
  providedIn: 'root'
})
export class DataService {
  // Profile methods
  getProfiles(): Observable<Profile[]>;
  createProfile(profile: Profile): Observable<Profile>;
  updateProfile(profile: Profile): Observable<Profile>;
  deleteProfile(id: number): Observable<void>;
  
  // Entry methods
  getEntries(profileId: number): Observable<Entry[]>;
  saveEntry(entry: Entry): Observable<Entry>;
  importEntries(file: File, profileId: number): Observable<any>;
  
  // Manga methods
  getMangas(): Observable<Manga[]>;
  saveManga(manga: Manga): Observable<Manga>;
  
  // Filter methods
  getPublishers(profileId: number): Observable<Publisher[]>;
  getFormats(profileId: number): Observable<Format[]>;
  
  // System methods
  getDatabaseStatistics(): Observable<DatabaseStats>;
  nukeDatabase(confirmation: NukeConfirmation): Observable<void>;
}
```

This completes the detailed component specifications for the Angular migration. Each component includes its inputs, outputs, state management requirements, key methods, and template structure.