# Angular Modules & Project Structure Guide

## Overview
This document provides a comprehensive guide for organizing Angular modules, implementing lazy loading, and structuring the MangaCount application for optimal maintainability and performance.

## Table of Contents
1. [Module Architecture Overview](#module-architecture-overview)
2. [Core Module Structure](#core-module-structure)
3. [Shared Module Implementation](#shared-module-implementation)
4. [Feature Modules](#feature-modules)
5. [Lazy Loading Strategy](#lazy-loading-strategy)
6. [Dependency Injection Configuration](#dependency-injection-configuration)
7. [Module Import/Export Patterns](#module-importexport-patterns)

---

## Module Architecture Overview

### Module Hierarchy
```
AppModule (Root)
??? CoreModule (Singleton services, guards, interceptors)
??? SharedModule (Reusable components, pipes, directives)
??? ProfileSelectionModule (Lazy loaded)
??? CollectionManagementModule (Lazy loaded)
??? ModalsModule (Shared modal components)
??? MaterialModule (Angular Material - Optional)
```

### Module Responsibilities

**AppModule**: Root module, basic setup, and routing configuration
**CoreModule**: Singleton services, HTTP interceptors, guards
**SharedModule**: Reusable UI components, pipes, directives
**Feature Modules**: Business logic separated by domain
**ModalsModule**: Centralized modal components

---

## Core Module Structure

### Core Module Implementation
```typescript
// src/app/core/core.module.ts
import { NgModule, Optional, SkipSelf, APP_INITIALIZER } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// Services
import { DataService } from './services/data.service';
import { ThemeService } from './services/theme.service';
import { ProfileService } from './services/profile.service';
import { NotificationService } from './services/notification.service';
import { LoadingService } from './services/loading.service';
import { LoadBearingService } from './services/load-bearing.service';

// Interceptors
import { ErrorInterceptor } from './interceptors/error.interceptor';
import { LoadingInterceptor } from './interceptors/loading.interceptor';
import { AuthInterceptor } from './interceptors/auth.interceptor';

// Guards
import { ProfileGuard } from './guards/profile.guard';
import { CanDeactivateGuard } from './guards/can-deactivate.guard';

// Initialization
import { AppInitializerService } from './services/app-initializer.service';

export function initializeApp(appInitializer: AppInitializerService) {
  return (): Promise<void> => appInitializer.initialize();
}

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    BrowserAnimationsModule
  ],
  providers: [
    // Core Services
    DataService,
    ThemeService,
    ProfileService,
    NotificationService,
    LoadingService,
    LoadBearingService,
    AppInitializerService,
    
    // Guards
    ProfileGuard,
    CanDeactivateGuard,
    
    // HTTP Interceptors
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    
    // App Initialization
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AppInitializerService],
      multi: true
    }
  ]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import it in the AppModule only.');
    }
  }
}
```

### Core Services Directory Structure
```
src/app/core/
??? services/
?   ??? data.service.ts              # Main API service
?   ??? theme.service.ts             # Theme management
?   ??? profile.service.ts           # Profile state management
?   ??? notification.service.ts      # Toast notifications
?   ??? loading.service.ts           # Loading state
?   ??? load-bearing.service.ts      # Infrastructure check
?   ??? app-initializer.service.ts   # App startup logic
?   ??? local-storage.service.ts     # Local storage utilities
?   ??? validation.service.ts        # Validation helpers
??? interceptors/
?   ??? error.interceptor.ts         # Global error handling
?   ??? loading.interceptor.ts       # Loading state management
?   ??? auth.interceptor.ts          # Authentication headers
??? guards/
?   ??? profile.guard.ts             # Profile selection guard
?   ??? can-deactivate.guard.ts      # Unsaved changes guard
??? config/
?   ??? api.config.ts                # API configuration
?   ??? app.config.ts                # Application configuration
??? core.module.ts
```

---

## Shared Module Implementation

### Shared Module Structure
```typescript
// src/app/shared/shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Angular Material (if using)
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

// Shared Components
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { LoadBearingCheckComponent } from './components/load-bearing-check/load-bearing-check.component';
import { StatusIndicatorComponent } from './components/status-indicator/status-indicator.component';
import { ProgressBarComponent } from './components/progress-bar/progress-bar.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { ImageUploaderComponent } from './components/image-uploader/image-uploader.component';

// Shared Pipes
import { SafeUrlPipe } from './pipes/safe-url.pipe';
import { TruncatePipe } from './pipes/truncate.pipe';
import { FileSizePipe } from './pipes/file-size.pipe';
import { RelativeDatePipe } from './pipes/relative-date.pipe';

// Shared Directives
import { ClickOutsideDirective } from './directives/click-outside.directive';
import { AutofocusDirective } from './directives/autofocus.directive';
import { LazyLoadDirective } from './directives/lazy-load.directive';

const SHARED_COMPONENTS = [
  LoadingSpinnerComponent,
  ThemeToggleComponent,
  LoadBearingCheckComponent,
  StatusIndicatorComponent,
  ProgressBarComponent,
  ConfirmDialogComponent,
  ImageUploaderComponent
];

const SHARED_PIPES = [
  SafeUrlPipe,
  TruncatePipe,
  FileSizePipe,
  RelativeDatePipe
];

const SHARED_DIRECTIVES = [
  ClickOutsideDirective,
  AutofocusDirective,
  LazyLoadDirective
];

const MATERIAL_MODULES = [
  MatButtonModule,
  MatIconModule,
  MatDialogModule,
  MatProgressSpinnerModule,
  MatTooltipModule
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ...MATERIAL_MODULES
  ],
  declarations: [
    ...SHARED_COMPONENTS,
    ...SHARED_PIPES,
    ...SHARED_DIRECTIVES
  ],
  exports: [
    // Angular modules
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    
    // Material modules
    ...MATERIAL_MODULES,
    
    // Shared components
    ...SHARED_COMPONENTS,
    
    // Shared pipes
    ...SHARED_PIPES,
    
    // Shared directives
    ...SHARED_DIRECTIVES
  ]
})
export class SharedModule {}
```

### Shared Components Directory
```
src/app/shared/
??? components/
?   ??? loading-spinner/
?   ?   ??? loading-spinner.component.ts
?   ?   ??? loading-spinner.component.html
?   ?   ??? loading-spinner.component.scss
?   ??? theme-toggle/
?   ?   ??? theme-toggle.component.ts
?   ?   ??? theme-toggle.component.html
?   ?   ??? theme-toggle.component.scss
?   ??? load-bearing-check/
?   ?   ??? load-bearing-check.component.ts
?   ?   ??? load-bearing-check.component.html
?   ?   ??? load-bearing-check.component.scss
?   ??? status-indicator/
?   ??? progress-bar/
?   ??? confirm-dialog/
?   ??? image-uploader/
??? pipes/
?   ??? safe-url.pipe.ts
?   ??? truncate.pipe.ts
?   ??? file-size.pipe.ts
?   ??? relative-date.pipe.ts
??? directives/
?   ??? click-outside.directive.ts
?   ??? autofocus.directive.ts
?   ??? lazy-load.directive.ts
??? models/
?   ??? [all model files]
??? shared.module.ts
```

---

## Feature Modules

### Profile Selection Module
```typescript
// src/app/features/profile-selection/profile-selection.module.ts
import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ProfileSelectionRoutingModule } from './profile-selection-routing.module';

// Components
import { ProfileSelectorComponent } from './components/profile-selector/profile-selector.component';
import { ProfileCircleComponent } from './components/profile-circle/profile-circle.component';
import { AddProfileModalComponent } from './components/add-profile-modal/add-profile-modal.component';

// Services
import { ProfileSelectionService } from './services/profile-selection.service';

@NgModule({
  imports: [
    SharedModule,
    ProfileSelectionRoutingModule
  ],
  declarations: [
    ProfileSelectorComponent,
    ProfileCircleComponent,
    AddProfileModalComponent
  ],
  providers: [
    ProfileSelectionService
  ]
})
export class ProfileSelectionModule {}
```

### Collection Management Module
```typescript
// src/app/features/collection-management/collection.module.ts
import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ModalsModule } from '../modals/modals.module';
import { CollectionRoutingModule } from './collection-routing.module';

// Main Components
import { CollectionLayoutComponent } from './components/collection-layout/collection-layout.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { CollectionViewComponent } from './components/collection-view/collection-view.component';

// View Components
import { EntryTableComponent } from './components/entry-table/entry-table.component';
import { EntryCardsComponent } from './components/entry-cards/entry-cards.component';
import { EntryCompactComponent } from './components/entry-compact/entry-compact.component';

// Filter Components
import { CollectionFiltersComponent } from './components/collection-filters/collection-filters.component';
import { CollectionHeaderComponent } from './components/collection-header/collection-header.component';

// Entry Components
import { EntryCardComponent } from './components/entry-card/entry-card.component';
import { QuickVolumeButtonsComponent } from './components/quick-volume-buttons/quick-volume-buttons.component';

// Services
import { CollectionService } from './services/collection.service';
import { EntryService } from './services/entry.service';
import { FilterService } from './services/filter.service';

@NgModule({
  imports: [
    SharedModule,
    ModalsModule,
    CollectionRoutingModule
  ],
  declarations: [
    CollectionLayoutComponent,
    SidebarComponent,
    CollectionViewComponent,
    EntryTableComponent,
    EntryCardsComponent,
    EntryCompactComponent,
    CollectionFiltersComponent,
    CollectionHeaderComponent,
    EntryCardComponent,
    QuickVolumeButtonsComponent
  ],
  providers: [
    CollectionService,
    EntryService,
    FilterService
  ]
})
export class CollectionModule {}
```

### Modals Module
```typescript
// src/app/features/modals/modals.module.ts
import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';

// Modal Components
import { AddEntryModalComponent } from './add-entry-modal/add-entry-modal.component';
import { AddMangaModalComponent } from './add-manga-modal/add-manga-modal.component';
import { AddProfileModalComponent } from './add-profile-modal/add-profile-modal.component';
import { NukeDataModalComponent } from './nuke-data-modal/nuke-data-modal.component';
import { ImportResultModalComponent } from './import-result-modal/import-result-modal.component';

// Modal Services
import { ModalService } from './services/modal.service';

const MODAL_COMPONENTS = [
  AddEntryModalComponent,
  AddMangaModalComponent,
  AddProfileModalComponent,
  NukeDataModalComponent,
  ImportResultModalComponent
];

@NgModule({
  imports: [
    SharedModule
  ],
  declarations: [
    ...MODAL_COMPONENTS
  ],
  exports: [
    ...MODAL_COMPONENTS
  ],
  providers: [
    ModalService
  ]
})
export class ModalsModule {}
```

---

## Lazy Loading Strategy

### App Routing Module
```typescript
// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileGuard } from './core/guards/profile.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/profiles',
    pathMatch: 'full'
  },
  {
    path: 'profiles',
    loadChildren: () => import('./features/profile-selection/profile-selection.module')
      .then(m => m.ProfileSelectionModule),
    title: 'Select Profile - MangaCount'
  },
  {
    path: 'collection',
    loadChildren: () => import('./features/collection-management/collection.module')
      .then(m => m.CollectionModule),
    canActivate: [ProfileGuard],
    title: 'Collection - MangaCount'
  },
  {
    path: 'settings',
    loadChildren: () => import('./features/settings/settings.module')
      .then(m => m.SettingsModule),
    title: 'Settings - MangaCount'
  },
  {
    path: '**',
    redirectTo: '/profiles'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    enableTracing: false, // Set to true for debugging
    preloadingStrategy: PreloadAllModules, // or custom preloading
    scrollPositionRestoration: 'top',
    anchorScrolling: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
```

### Feature Module Routing
```typescript
// src/app/features/profile-selection/profile-selection-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileSelectorComponent } from './components/profile-selector/profile-selector.component';

const routes: Routes = [
  {
    path: '',
    component: ProfileSelectorComponent,
    title: 'Select Profile - MangaCount'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProfileSelectionRoutingModule {}
```

```typescript
// src/app/features/collection-management/collection-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CollectionLayoutComponent } from './components/collection-layout/collection-layout.component';
import { CanDeactivateGuard } from '../../core/guards/can-deactivate.guard';

const routes: Routes = [
  {
    path: '',
    component: CollectionLayoutComponent,
    canDeactivate: [CanDeactivateGuard],
    children: [
      {
        path: '',
        redirectTo: 'view',
        pathMatch: 'full'
      },
      {
        path: 'view',
        loadComponent: () => import('./components/collection-view/collection-view.component')
          .then(c => c.CollectionViewComponent),
        title: 'Collection View - MangaCount'
      },
      {
        path: 'import',
        loadComponent: () => import('./components/import-view/import-view.component')
          .then(c => c.ImportViewComponent),
        title: 'Import Collection - MangaCount'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CollectionRoutingModule {}
```

---

## Dependency Injection Configuration

### Service Provider Configuration
```typescript
// src/app/core/config/service.config.ts
import { InjectionToken, Provider } from '@angular/core';
import { environment } from '../../../environments/environment';

// Configuration tokens
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
export const STORAGE_CONFIG = new InjectionToken<StorageConfig>('STORAGE_CONFIG');

export interface AppConfig {
  production: boolean;
  apiUrl: string;
  version: string;
  features: {
    enableAnalytics: boolean;
    enablePushNotifications: boolean;
    enableOfflineMode: boolean;
  };
}

export interface StorageConfig {
  keyPrefix: string;
  encryption: boolean;
}

// Configuration providers
export const CONFIG_PROVIDERS: Provider[] = [
  {
    provide: API_BASE_URL,
    useValue: environment.apiUrl
  },
  {
    provide: APP_CONFIG,
    useValue: {
      production: environment.production,
      apiUrl: environment.apiUrl,
      version: environment.version,
      features: {
        enableAnalytics: environment.enableAnalytics,
        enablePushNotifications: false,
        enableOfflineMode: false
      }
    } as AppConfig
  },
  {
    provide: STORAGE_CONFIG,
    useValue: {
      keyPrefix: 'mangacount_',
      encryption: environment.production
    } as StorageConfig
  }
];
```

### Environment Configuration
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: '/api',
  version: '2.0.0',
  enableAnalytics: false,
  enableDevTools: true,
  logLevel: 'debug'
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.mangacount.com',
  version: '2.0.0',
  enableAnalytics: true,
  enableDevTools: false,
  logLevel: 'error'
};
```

---

## Module Import/Export Patterns

### Barrel Exports
```typescript
// src/app/shared/index.ts
export * from './shared.module';
export * from './models';
export * from './components';
export * from './pipes';
export * from './directives';

// src/app/shared/models/index.ts
export * from './profile.model';
export * from './manga.model';
export * from './entry.model';
export * from './publisher.model';
export * from './format.model';
export * from './collection.model';
export * from './api-response.model';
export * from './notification.model';

// src/app/shared/components/index.ts
export * from './loading-spinner/loading-spinner.component';
export * from './theme-toggle/theme-toggle.component';
export * from './load-bearing-check/load-bearing-check.component';
// ... other components
```

### App Module Implementation
```typescript
// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';

import { AppComponent } from './app.component';
import { CONFIG_PROVIDERS } from './core/config/service.config';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CoreModule,
    SharedModule
  ],
  providers: [
    ...CONFIG_PROVIDERS
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

### Feature Module Best Practices

#### 1. Single Responsibility
Each feature module should handle one business domain:
- ProfileSelectionModule: Profile management
- CollectionModule: Manga collection management
- SettingsModule: Application settings

#### 2. Clear Module Boundaries
```typescript
// Good: Clear separation
@NgModule({
  imports: [SharedModule], // Only shared dependencies
  declarations: [/* Only components for this feature */],
  providers: [/* Only services for this feature */]
})
export class FeatureModule {}

// Avoid: Cross-feature dependencies
@NgModule({
  imports: [
    SharedModule,
    AnotherFeatureModule // Avoid this
  ]
})
export class FeatureModule {}
```

#### 3. Service Scoping
```typescript
// Feature-scoped service
@Injectable({
  providedIn: 'root' // Global scope - use for shared services
})
export class DataService {}

@Injectable() // Feature scope - provide in feature module
export class FeatureSpecificService {}
```

#### 4. Component Organization
```
feature-module/
??? components/
?   ??? smart-components/     # Container components
?   ??? presentation/         # Presentational components
??? services/
??? models/
??? feature.module.ts
```

This module structure provides a solid foundation for the Angular migration, ensuring proper separation of concerns, lazy loading capabilities, and maintainable code organization.