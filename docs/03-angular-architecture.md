# Angular Architecture & Migration Plan

## Overview
This document outlines the complete Angular architecture for migrating the MangaCount React application, including project structure, dependency management, routing strategy, and implementation phases.

## Table of Contents
1. [Project Structure](#project-structure)
2. [Angular Dependencies](#angular-dependencies)
3. [Architecture Patterns](#architecture-patterns)
4. [Service Layer Design](#service-layer-design)
5. [Routing Strategy](#routing-strategy)
6. [State Management](#state-management)
7. [Migration Phases](#migration-phases)
8. [Implementation Timeline](#implementation-timeline)

---

## Project Structure

### Recommended Angular Project Structure
```
mangacount-angular/
??? src/
?   ??? app/
?   ?   ??? core/                          # Core module (singletons)
?   ?   ?   ??? services/
?   ?   ?   ?   ??? data.service.ts        # Main API service
?   ?   ?   ?   ??? theme.service.ts       # Theme management
?   ?   ?   ?   ??? profile.service.ts     # Profile state management
?   ?   ?   ?   ??? notification.service.ts # Error/success notifications
?   ?   ?   ?   ??? load-bearing.service.ts # Infrastructure check
?   ?   ?   ??? interceptors/
?   ?   ?   ?   ??? error.interceptor.ts   # Global error handling
?   ?   ?   ?   ??? loading.interceptor.ts # Loading state management
?   ?   ?   ??? guards/
?   ?   ?   ?   ??? profile.guard.ts       # Profile selection guard
?   ?   ?   ??? core.module.ts
?   ?   ?
?   ?   ??? shared/                        # Shared module
?   ?   ?   ??? components/
?   ?   ?   ?   ??? loading-spinner/
?   ?   ?   ?   ?   ??? loading-spinner.component.ts
?   ?   ?   ?   ?   ??? loading-spinner.component.html
?   ?   ?   ?   ?   ??? loading-spinner.component.scss
?   ?   ?   ?   ??? theme-toggle/
?   ?   ?   ?   ?   ??? theme-toggle.component.ts
?   ?   ?   ?   ?   ??? theme-toggle.component.html
?   ?   ?   ?   ?   ??? theme-toggle.component.scss
?   ?   ?   ?   ??? load-bearing-check/
?   ?   ?   ?       ??? load-bearing-check.component.ts
?   ?   ?   ?       ??? load-bearing-check.component.html
?   ?   ?   ?       ??? load-bearing-check.component.scss
?   ?   ?   ??? models/
?   ?   ?   ?   ??? profile.model.ts
?   ?   ?   ?   ??? manga.model.ts
?   ?   ?   ?   ??? entry.model.ts
?   ?   ?   ?   ??? publisher.model.ts
?   ?   ?   ?   ??? format.model.ts
?   ?   ?   ??? directives/
?   ?   ?   ??? pipes/
?   ?   ?   ??? shared.module.ts
?   ?   ?
?   ?   ??? features/                      # Feature modules
?   ?   ?   ??? profile-selection/
?   ?   ?   ?   ??? components/
?   ?   ?   ?   ?   ??? profile-selector/
?   ?   ?   ?   ?   ?   ??? profile-selector.component.ts
?   ?   ?   ?   ?   ?   ??? profile-selector.component.html
?   ?   ?   ?   ?   ?   ??? profile-selector.component.scss
?   ?   ?   ?   ?   ??? add-profile-modal/
?   ?   ?   ?   ?       ??? add-profile-modal.component.ts
?   ?   ?   ?   ?       ??? add-profile-modal.component.html
?   ?   ?   ?   ?       ??? add-profile-modal.component.scss
?   ?   ?   ?   ??? services/
?   ?   ?   ?   ?   ??? profile-selection.service.ts
?   ?   ?   ?   ??? profile-selection-routing.module.ts
?   ?   ?   ?   ??? profile-selection.module.ts
?   ?   ?   ?
?   ?   ?   ??? collection-management/
?   ?   ?   ?   ??? components/
?   ?   ?   ?   ?   ??? sidebar/
?   ?   ?   ?   ?   ?   ??? sidebar.component.ts
?   ?   ?   ?   ?   ?   ??? sidebar.component.html
?   ?   ?   ?   ?   ?   ??? sidebar.component.scss
?   ?   ?   ?   ?   ??? collection-view/
?   ?   ?   ?   ?   ?   ??? collection-view.component.ts
?   ?   ?   ?   ?   ?   ??? collection-view.component.html
?   ?   ?   ?   ?   ?   ??? collection-view.component.scss
?   ?   ?   ?   ?   ??? entry-table/
?   ?   ?   ?   ?   ??? entry-cards/
?   ?   ?   ?   ?   ??? entry-compact/
?   ?   ?   ?   ?   ??? collection-filters/
?   ?   ?   ?   ??? services/
?   ?   ?   ?   ?   ??? collection.service.ts
?   ?   ?   ?   ?   ??? entry.service.ts
?   ?   ?   ?   ??? collection-routing.module.ts
?   ?   ?   ?   ??? collection.module.ts
?   ?   ?   ?
?   ?   ?   ??? modals/
?   ?   ?       ??? add-entry-modal/
?   ?   ?       ?   ??? add-entry-modal.component.ts
?   ?   ?       ?   ??? add-entry-modal.component.html
?   ?   ?       ?   ??? add-entry-modal.component.scss
?   ?   ?       ??? add-manga-modal/
?   ?   ?       ??? nuke-data-modal/
?   ?   ?       ??? modals.module.ts
?   ?   ?
?   ?   ??? app-routing.module.ts
?   ?   ??? app.component.ts
?   ?   ??? app.component.html
?   ?   ??? app.component.scss
?   ?   ??? app.module.ts
?   ?
?   ??? assets/
?   ?   ??? styles/
?   ?   ?   ??? _variables.scss            # SCSS variables
?   ?   ?   ??? _mixins.scss               # SCSS mixins
?   ?   ?   ??? _themes.scss               # Theme definitions
?   ?   ?   ??? _components.scss           # Common component styles
?   ?   ??? images/
?   ?
?   ??? environments/
?   ?   ??? environment.ts
?   ?   ??? environment.prod.ts
?   ?
?   ??? styles.scss                        # Global styles
?   ??? main.ts
?   ??? index.html
?
??? angular.json
??? package.json
??? tsconfig.json
??? tsconfig.app.json
??? tsconfig.spec.json
```

---

## Angular Dependencies

### Core Angular Dependencies
```json
{
  "dependencies": {
    "@angular/animations": "^17.0.0",
    "@angular/common": "^17.0.0",
    "@angular/compiler": "^17.0.0",
    "@angular/core": "^17.0.0",
    "@angular/forms": "^17.0.0",
    "@angular/platform-browser": "^17.0.0",
    "@angular/platform-browser-dynamic": "^17.0.0",
    "@angular/router": "^17.0.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.14.0"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^17.0.0",
    "@angular/cli": "^17.0.0",
    "@angular/compiler-cli": "^17.0.0",
    "@types/jasmine": "~5.1.0",
    "@types/node": "^18.18.0",
    "jasmine-core": "~5.1.0",
    "karma": "~6.4.0",
    "karma-chrome-headless": "~3.2.0",
    "karma-coverage": "~2.2.0",
    "karma-jasmine": "~5.1.0",
    "karma-jasmine-html-reporter": "~2.1.0",
    "typescript": "~5.2.0"
  }
}
```

### Additional Dependencies for Features
```json
{
  "dependencies": {
    "@angular/cdk": "^17.0.0",           // For overlays, drag-drop
    "@angular/material": "^17.0.0",     // Optional: Material Design components
    "ng-bootstrap": "^16.0.0",          // Optional: Bootstrap components
    "@ngrx/store": "^17.0.0",           // Optional: Advanced state management
    "@ngrx/effects": "^17.0.0",         // Optional: Side effects
    "@ngrx/store-devtools": "^17.0.0",  // Optional: DevTools
    "ngx-toastr": "^18.0.0",            // Toast notifications
    "ngx-spinner": "^17.0.0"            // Loading spinners
  }
}
```

---

## Architecture Patterns

### 1. Module Organization
- **Core Module**: Singleton services, guards, interceptors (imported once in AppModule)
- **Shared Module**: Reusable components, directives, pipes (imported in feature modules)
- **Feature Modules**: Lazy-loaded modules for major features
- **Modal Module**: Centralized modal components

### 2. Component Communication Patterns
```typescript
// Parent to Child: Input properties
@Input() entries: Entry[];

// Child to Parent: Event emitters
@Output() refresh = new EventEmitter<void>();

// Sibling Components: Service communication
export class DataService {
  private entriesSubject = new BehaviorSubject<Entry[]>([]);
  entries$ = this.entriesSubject.asObservable();
}

// Global State: RxJS subjects or NgRx store
export class ProfileService {
  private selectedProfileSubject = new BehaviorSubject<Profile | null>(null);
  selectedProfile$ = this.selectedProfileSubject.asObservable();
}
```

### 3. Service Design Patterns
```typescript
// Repository Pattern for API calls
@Injectable({
  providedIn: 'root'
})
export class DataService {
  constructor(private http: HttpClient) {}
  
  getEntries(profileId: number): Observable<Entry[]> {
    return this.http.get<Entry[]>(`/api/entry?profileId=${profileId}`);
  }
}

// Facade Pattern for complex operations
@Injectable({
  providedIn: 'root'
})
export class CollectionFacadeService {
  constructor(
    private dataService: DataService,
    private notificationService: NotificationService
  ) {}
  
  async importCollection(file: File, profileId: number): Promise<void> {
    try {
      const result = await this.dataService.importEntries(file, profileId).toPromise();
      this.notificationService.showSuccess('Import successful!');
    } catch (error) {
      this.notificationService.showError('Import failed: ' + error.message);
    }
  }
}
```

---

## Service Layer Design

### Core Services

#### 1. DataService
```typescript
@Injectable({
  providedIn: 'root'
})
export class DataService {
  private baseUrl = '/api';
  
  constructor(private http: HttpClient) {}
  
  // Profiles
  getProfiles(): Observable<Profile[]> {
    return this.http.get<Profile[]>(`${this.baseUrl}/profile`);
  }
  
  createProfile(profile: CreateProfileDto): Observable<Profile> {
    return this.http.post<Profile>(`${this.baseUrl}/profile`, profile);
  }
  
  updateProfile(profile: Profile): Observable<Profile> {
    return this.http.put<Profile>(`${this.baseUrl}/profile/${profile.id}`, profile);
  }
  
  deleteProfile(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/profile/${id}`);
  }
  
  // Entries
  getEntries(profileId: number): Observable<Entry[]> {
    return this.http.get<Entry[]>(`${this.baseUrl}/entry?profileId=${profileId}`);
  }
  
  saveEntry(entry: Entry): Observable<Entry> {
    return this.http.post<Entry>(`${this.baseUrl}/entry`, entry);
  }
  
  importEntries(file: File, profileId: number): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportResult>(`${this.baseUrl}/entry/import/${profileId}`, formData);
  }
  
  // Manga
  getMangas(): Observable<Manga[]> {
    return this.http.get<Manga[]>(`${this.baseUrl}/manga`);
  }
  
  saveManga(manga: Manga): Observable<Manga> {
    if (manga.id) {
      return this.http.put<Manga>(`${this.baseUrl}/manga/${manga.id}`, manga);
    } else {
      return this.http.post<Manga>(`${this.baseUrl}/manga`, manga);
    }
  }
  
  // Filters
  getPublishersForProfile(profileId: number): Observable<PublisherCount[]> {
    return this.http.get<PublisherCount[]>(`${this.baseUrl}/entry/filters/publishers?profileId=${profileId}`);
  }
  
  getFormatsForProfile(profileId: number): Observable<FormatCount[]> {
    return this.http.get<FormatCount[]>(`${this.baseUrl}/entry/filters/formats?profileId=${profileId}`);
  }
}
```

#### 2. ThemeService
```typescript
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'mangacount-theme';
  private isDarkModeSubject = new BehaviorSubject<boolean>(this.getStoredTheme());
  
  isDarkMode$ = this.isDarkModeSubject.asObservable();
  
  constructor() {
    this.applyTheme(this.isDarkModeSubject.value);
  }
  
  get currentTheme(): 'dark' | 'light' {
    return this.isDarkModeSubject.value ? 'dark' : 'light';
  }
  
  toggleTheme(): void {
    const newTheme = !this.isDarkModeSubject.value;
    this.setTheme(newTheme);
  }
  
  setTheme(isDark: boolean): void {
    this.isDarkModeSubject.next(isDark);
    this.applyTheme(isDark);
    this.storeTheme(isDark);
  }
  
  private getStoredTheme(): boolean {
    const stored = localStorage.getItem(this.THEME_KEY);
    return stored ? stored === 'dark' : true; // Default to dark
  }
  
  private storeTheme(isDark: boolean): void {
    localStorage.setItem(this.THEME_KEY, isDark ? 'dark' : 'light');
  }
  
  private applyTheme(isDark: boolean): void {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }
}
```

#### 3. ProfileService
```typescript
@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly SELECTED_PROFILE_KEY = 'selectedProfileId';
  private selectedProfileSubject = new BehaviorSubject<Profile | null>(null);
  private profilesSubject = new BehaviorSubject<Profile[]>([]);
  
  selectedProfile$ = this.selectedProfileSubject.asObservable();
  profiles$ = this.profilesSubject.asObservable();
  
  constructor(private dataService: DataService) {}
  
  async loadProfiles(): Promise<Profile[]> {
    try {
      const profiles = await this.dataService.getProfiles().toPromise();
      this.profilesSubject.next(profiles || []);
      return profiles || [];
    } catch (error) {
      console.error('Error loading profiles:', error);
      return [];
    }
  }
  
  selectProfile(profile: Profile, saveSelection: boolean = true): void {
    this.selectedProfileSubject.next(profile);
    if (saveSelection) {
      localStorage.setItem(this.SELECTED_PROFILE_KEY, profile.id.toString());
    }
  }
  
  clearSelectedProfile(): void {
    this.selectedProfileSubject.next(null);
    localStorage.removeItem(this.SELECTED_PROFILE_KEY);
  }
  
  getStoredProfileId(): number | null {
    const stored = localStorage.getItem(this.SELECTED_PROFILE_KEY);
    return stored ? parseInt(stored, 10) : null;
  }
  
  async createProfile(profileData: CreateProfileDto): Promise<Profile> {
    const profile = await this.dataService.createProfile(profileData).toPromise();
    if (profile) {
      await this.loadProfiles(); // Refresh list
    }
    return profile!;
  }
  
  async updateProfile(profile: Profile): Promise<Profile> {
    const updated = await this.dataService.updateProfile(profile).toPromise();
    if (updated) {
      await this.loadProfiles(); // Refresh list
      if (this.selectedProfileSubject.value?.id === profile.id) {
        this.selectedProfileSubject.next(updated);
      }
    }
    return updated!;
  }
  
  async deleteProfile(id: number): Promise<void> {
    await this.dataService.deleteProfile(id).toPromise();
    await this.loadProfiles(); // Refresh list
    if (this.selectedProfileSubject.value?.id === id) {
      this.clearSelectedProfile();
    }
  }
}
```

#### 4. NotificationService
```typescript
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new Subject<Notification>();
  
  notifications$ = this.notificationsSubject.asObservable();
  
  showSuccess(message: string, duration: number = 3000): void {
    this.show(message, 'success', duration);
  }
  
  showError(message: string, duration: number = 5000): void {
    this.show(message, 'error', duration);
  }
  
  showInfo(message: string, duration: number = 3000): void {
    this.show(message, 'info', duration);
  }
  
  private show(message: string, type: NotificationType, duration: number): void {
    const notification: Notification = {
      id: Date.now(),
      message,
      type,
      duration
    };
    this.notificationsSubject.next(notification);
  }
}
```

---

## Routing Strategy

### Router Configuration
```typescript
// app-routing.module.ts
const routes: Routes = [
  {
    path: '',
    redirectTo: '/profiles',
    pathMatch: 'full'
  },
  {
    path: 'profiles',
    loadChildren: () => import('./features/profile-selection/profile-selection.module').then(m => m.ProfileSelectionModule)
  },
  {
    path: 'collection',
    loadChildren: () => import('./features/collection-management/collection.module').then(m => m.CollectionModule),
    canActivate: [ProfileGuard]
  },
  {
    path: '**',
    redirectTo: '/profiles'
  }
];
```

### Route Guards
```typescript
@Injectable({
  providedIn: 'root'
})
export class ProfileGuard implements CanActivate {
  constructor(
    private profileService: ProfileService,
    private router: Router
  ) {}
  
  canActivate(): Observable<boolean> {
    return this.profileService.selectedProfile$.pipe(
      map(profile => {
        if (profile) {
          return true;
        } else {
          this.router.navigate(['/profiles']);
          return false;
        }
      })
    );
  }
}
```

---

## State Management

### Option 1: Service-Based State (Recommended for this app)
Using RxJS subjects and services for state management as shown in the service examples above.

**Pros:**
- Simple and lightweight
- Good for medium-complexity apps
- Easy to understand and maintain
- Direct control over state

**Cons:**
- Manual state synchronization
- No time-travel debugging
- Limited scalability for complex state

### Option 2: NgRx Store (Optional for future scalability)
```typescript
// State definition
export interface AppState {
  profiles: ProfileState;
  collection: CollectionState;
  ui: UiState;
}

// Actions
export const loadProfiles = createAction('[Profile] Load Profiles');
export const loadProfilesSuccess = createAction(
  '[Profile] Load Profiles Success',
  props<{ profiles: Profile[] }>()
);

// Reducers
const profileReducer = createReducer(
  initialProfileState,
  on(loadProfilesSuccess, (state, { profiles }) => ({ ...state, profiles }))
);

// Effects
@Injectable()
export class ProfileEffects {
  loadProfiles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadProfiles),
      switchMap(() =>
        this.dataService.getProfiles().pipe(
          map(profiles => loadProfilesSuccess({ profiles }))
        )
      )
    )
  );
}
```

---

## Migration Phases

### Phase 1: Project Setup & Core Infrastructure (Week 1)
1. **Create Angular project**
   - Initialize with Angular CLI
   - Configure TypeScript, SCSS, and linting
   - Set up project structure

2. **Implement core services**
   - DataService with HTTP client
   - ThemeService for dark/light mode
   - NotificationService for user feedback

3. **Create shared components**
   - LoadingSpinner
   - ThemeToggle
   - LoadBearingCheck

4. **Set up routing and guards**
   - Basic routing structure
   - ProfileGuard implementation

### Phase 2: Profile Management (Week 2)
1. **Profile selection feature**
   - ProfileSelector component
   - ProfileService implementation
   - Profile circle grid with avatars

2. **Profile modals**
   - AddProfileModal component
   - Image upload functionality
   - Profile CRUD operations

3. **Navigation flow**
   - Profile selection to main app
   - Back navigation
   - Profile switching

### Phase 3: Collection Display (Week 3)
1. **Collection view component**
   - Basic entry display
   - Loading states
   - Empty states

2. **View modes**
   - Table view implementation
   - Cards view implementation
   - Compact view implementation

3. **Filtering and sorting**
   - Filter controls
   - Sort functionality
   - Status indicators

### Phase 4: Data Management (Week 4)
1. **Entry management**
   - AddEntryModal component
   - Quick volume updates
   - Entry editing

2. **Manga management**
   - AddMangaModal component
   - Publisher and format management
   - Manga library display

3. **Import functionality**
   - File upload handling
   - TSV parsing
   - Progress feedback

### Phase 5: Advanced Features (Week 5)
1. **Sidebar implementation**
   - Quick actions
   - Import section
   - Manga library display

2. **Advanced filtering**
   - Publisher filter
   - Format filter
   - Dynamic filter options

3. **Data operations**
   - Nuclear option (NukeDataModal)
   - Database statistics
   - Bulk operations

### Phase 6: Polish & Testing (Week 6)
1. **Styling and theming**
   - Complete SCSS conversion
   - Theme system implementation
   - Responsive design

2. **Testing implementation**
   - Unit tests for components
   - Service tests
   - Integration tests

3. **Performance optimization**
   - OnPush change detection
   - Lazy loading optimization
   - Bundle analysis

---

## Implementation Timeline

### Development Schedule (6 weeks)

**Week 1: Foundation**
- Days 1-2: Project setup and configuration
- Days 3-4: Core services implementation
- Days 5-7: Shared components and routing

**Week 2: Profile System**
- Days 1-3: Profile selection component
- Days 4-5: Profile modals and CRUD
- Days 6-7: Navigation and state management

**Week 3: Collection Core**
- Days 1-3: Collection view basic structure
- Days 4-5: View modes implementation
- Days 6-7: Filtering and sorting

**Week 4: Data Management**
- Days 1-3: Entry management modals
- Days 4-5: Manga management system
- Days 6-7: Import functionality

**Week 5: Advanced Features**
- Days 1-3: Sidebar complete implementation
- Days 4-5: Advanced filtering systems
- Days 6-7: Special data operations

**Week 6: Finalization**
- Days 1-3: Styling and theming completion
- Days 4-5: Testing implementation
- Days 6-7: Performance optimization and deployment

### Success Criteria
- [ ] All React functionality migrated
- [ ] Identical visual appearance
- [ ] Same user experience flow
- [ ] Performance equivalent or better
- [ ] Mobile responsiveness maintained
- [ ] Theme switching functional
- [ ] All API integrations working
- [ ] Import/export functionality complete
- [ ] Unit test coverage > 80%
- [ ] No accessibility regressions

This architecture plan provides a comprehensive roadmap for migrating the MangaCount React application to Angular while maintaining all functionality and improving maintainability.