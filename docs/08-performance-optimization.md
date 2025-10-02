# Performance Optimization & Best Practices Guide

## Overview
This document provides comprehensive guidelines for optimizing performance in the Angular MangaCount application, including change detection strategies, lazy loading, memory management, and best practices for achieving optimal performance while maintaining the exact functionality of the React version.

## Table of Contents
1. [Performance Monitoring Setup](#performance-monitoring-setup)
2. [Change Detection Optimization](#change-detection-optimization)
3. [Memory Management](#memory-management)
4. [Bundle Optimization](#bundle-optimization)
5. [Runtime Performance](#runtime-performance)
6. [Component Optimization](#component-optimization)
7. [Service Worker Implementation](#service-worker-implementation)
8. [Performance Monitoring](#performance-monitoring)

---

## Performance Monitoring Setup

### Performance Metrics Configuration
```typescript
// src/app/core/services/performance.service.ts
import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface PerformanceMetrics {
  navigationTime: number;
  renderTime: number;
  memoryUsage: number;
  bundleSize: number;
  apiResponseTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private metrics: PerformanceMetrics[] = [];
  private navigationStart: number = 0;

  constructor(private router: Router) {
    this.setupNavigationTracking();
    this.setupPerformanceObserver();
  }

  private setupNavigationTracking(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.measureNavigationTime();
    });
  }

  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.recordNavigationMetrics(entry as PerformanceNavigationTiming);
          } else if (entry.entryType === 'paint') {
            this.recordPaintMetrics(entry);
          }
        }
      });

      observer.observe({ entryTypes: ['navigation', 'paint', 'measure'] });
    }
  }

  measureNavigationTime(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      console.log('Navigation metrics:', {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.getFirstContentfulPaint()
      });
    }
  }

  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : 0;
  }

  measureComponentRenderTime(componentName: string, startTime: number): void {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    performance.mark(`${componentName}-render-end`);
    performance.measure(
      `${componentName}-render-time`,
      `${componentName}-render-start`,
      `${componentName}-render-end`
    );

    console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
  }

  getMemoryUsage(): any {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  }

  trackApiCall(endpoint: string, startTime: number, endTime: number): void {
    const duration = endTime - startTime;
    console.log(`API call to ${endpoint}: ${duration.toFixed(2)}ms`);
    
    // Track slow API calls
    if (duration > 1000) {
      console.warn(`Slow API call detected: ${endpoint} took ${duration.toFixed(2)}ms`);
    }
  }
}
```

### Performance Interceptor
```typescript
// src/app/core/interceptors/performance.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PerformanceService } from '../services/performance.service';

@Injectable()
export class PerformanceInterceptor implements HttpInterceptor {
  constructor(private performanceService: PerformanceService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    const startTime = performance.now();
    
    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          const endTime = performance.now();
          this.performanceService.trackApiCall(req.url, startTime, endTime);
        }
      })
    );
  }
}
```

---

## Change Detection Optimization

### OnPush Change Detection Strategy
```typescript
// src/app/features/collection-management/components/collection-view/collection-view.component.ts
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { map, takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { Entry, Manga, Profile, ViewMode, FilterBy, SortBy } from '../../../../shared/models';

@Component({
  selector: 'app-collection-view',
  templateUrl: './collection-view.component.html',
  styleUrls: ['./collection-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CollectionViewComponent implements OnInit, OnDestroy {
  @Input() entries: Entry[] = [];
  @Input() mangas: Manga[] = [];
  @Input() selectedProfile: Profile | null = null;
  @Input() loading: boolean = false;
  @Output() refresh = new EventEmitter<void>();

  // Use BehaviorSubjects for reactive state management
  private filterSubject = new BehaviorSubject<FilterBy>('all');
  private sortSubject = new BehaviorSubject<SortBy>('name');
  private viewModeSubject = new BehaviorSubject<ViewMode>('table');
  private publisherFilterSubject = new BehaviorSubject<string>('all');
  private formatFilterSubject = new BehaviorSubject<string>('all');
  
  private destroy$ = new Subject<void>();

  // Reactive computed properties
  filteredEntries$ = combineLatest([
    this.filterSubject,
    this.publisherFilterSubject,
    this.formatFilterSubject
  ]).pipe(
    map(([filter, publisher, format]) => this.applyFilters(filter, publisher, format)),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    takeUntil(this.destroy$)
  );

  sortedEntries$ = combineLatest([
    this.filteredEntries$,
    this.sortSubject
  ]).pipe(
    map(([entries, sortBy]) => this.applySorting(entries, sortBy)),
    takeUntil(this.destroy$)
  );

  // Getters for template binding
  get filter(): FilterBy { return this.filterSubject.value; }
  set filter(value: FilterBy) { this.filterSubject.next(value); }

  get sortBy(): SortBy { return this.sortSubject.value; }
  set sortBy(value: SortBy) { this.sortSubject.next(value); }

  get viewMode(): ViewMode { return this.viewModeSubject.value; }
  set viewMode(value: ViewMode) { this.viewModeSubject.next(value); }

  ngOnInit(): void {
    // Mark for check when reactive streams emit
    this.filteredEntries$.subscribe(() => {
      // Component will be checked automatically due to OnPush + async pipe
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private applyFilters(filter: FilterBy, publisher: string, format: string): Entry[] {
    let filtered = [...this.entries];

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(entry => {
        const status = this.getEntryStatus(entry);
        switch (filter) {
          case 'complete': return status === 'complete';
          case 'incomplete': return status === 'incomplete';
          case 'priority-incomplete': return status === 'priority-incomplete';
          case 'priority': return entry.priority;
          case 'pending': return !!entry.pending;
          default: return true;
        }
      });
    }

    // Apply publisher filter
    if (publisher !== 'all') {
      filtered = filtered.filter(entry => 
        entry.manga.publisherId.toString() === publisher
      );
    }

    // Apply format filter
    if (format !== 'all') {
      filtered = filtered.filter(entry => 
        entry.manga.formatId.toString() === format
      );
    }

    return filtered;
  }

  private applySorting(entries: Entry[], sortBy: SortBy): Entry[] {
    return [...entries].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.manga.name.localeCompare(b.manga.name);
        case 'completion':
          const completionA = this.getCompletionPercentage(a) || 0;
          const completionB = this.getCompletionPercentage(b) || 0;
          return completionB - completionA;
        case 'quantity':
          return b.quantity - a.quantity;
        case 'priority':
          return (b.priority ? 1 : 0) - (a.priority ? 1 : 0);
        case 'publisher':
          return (a.manga.publisher?.name || '').localeCompare(b.manga.publisher?.name || '');
        case 'format':
          return (a.manga.format?.name || '').localeCompare(b.manga.format?.name || '');
        default:
          return 0;
      }
    });
  }

  // Optimized methods with memoization
  private statusCache = new Map<number, string>();
  
  getEntryStatus(entry: Entry): string {
    const cacheKey = `${entry.id}-${entry.quantity}-${entry.priority}-${entry.manga.volumes}`;
    if (this.statusCache.has(cacheKey)) {
      return this.statusCache.get(cacheKey)!;
    }

    let status: string;
    if (entry.manga.volumes && entry.quantity >= entry.manga.volumes) {
      status = 'complete';
    } else if (entry.priority) {
      status = 'priority-incomplete';
    } else {
      status = 'incomplete';
    }

    this.statusCache.set(cacheKey, status);
    return status;
  }

  // TrackBy functions for ngFor optimization
  trackByEntryId(index: number, entry: Entry): number {
    return entry.id;
  }

  trackByMangaId(index: number, manga: Manga): number {
    return manga.id;
  }
}
```

### Immutable Data Patterns
```typescript
// src/app/core/services/collection.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Entry } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class CollectionService {
  private entriesSubject = new BehaviorSubject<Entry[]>([]);
  entries$: Observable<Entry[]> = this.entriesSubject.asObservable();

  get currentEntries(): Entry[] {
    return this.entriesSubject.value;
  }

  // Always create new arrays for immutability
  updateEntry(updatedEntry: Entry): void {
    const currentEntries = this.currentEntries;
    const entryIndex = currentEntries.findIndex(e => e.id === updatedEntry.id);
    
    if (entryIndex >= 0) {
      // Create new array with updated entry
      const newEntries = [
        ...currentEntries.slice(0, entryIndex),
        { ...updatedEntry }, // Create new entry object
        ...currentEntries.slice(entryIndex + 1)
      ];
      this.entriesSubject.next(newEntries);
    }
  }

  addEntry(newEntry: Entry): void {
    const currentEntries = this.currentEntries;
    // Create new array with new entry
    const newEntries = [...currentEntries, { ...newEntry }];
    this.entriesSubject.next(newEntries);
  }

  removeEntry(entryId: number): void {
    const currentEntries = this.currentEntries;
    // Create new array without removed entry
    const newEntries = currentEntries.filter(e => e.id !== entryId);
    this.entriesSubject.next(newEntries);
  }

  setEntries(entries: Entry[]): void {
    // Deep clone entries to ensure immutability
    const newEntries = entries.map(entry => ({ ...entry }));
    this.entriesSubject.next(newEntries);
  }
}
```

---

## Memory Management

### Subscription Management
```typescript
// src/app/shared/components/base/base.component.ts
import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  template: ''
})
export abstract class BaseComponent implements OnDestroy {
  protected destroy$ = new Subject<void>();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// Usage in components
import { Component, OnInit } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { BaseComponent } from '../../shared/components/base/base.component';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-example',
  template: ''
})
export class ExampleComponent extends BaseComponent implements OnInit {
  constructor(private dataService: DataService) {
    super();
  }

  ngOnInit(): void {
    // Automatically unsubscribe when component is destroyed
    this.dataService.getEntries(1).pipe(
      takeUntil(this.destroy$)
    ).subscribe(entries => {
      // Handle entries
    });
  }
}
```

### Memory Leak Detection
```typescript
// src/app/core/services/memory-monitor.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MemoryMonitorService {
  private memoryUsageHistory: number[] = [];
  private monitoringInterval?: number;

  startMonitoring(): void {
    if (this.monitoringInterval) return;

    this.monitoringInterval = window.setInterval(() => {
      this.checkMemoryUsage();
    }, 5000); // Check every 5 seconds
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  private checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedJSHeapSize = memory.usedJSHeapSize;
      
      this.memoryUsageHistory.push(usedJSHeapSize);
      
      // Keep only last 20 measurements
      if (this.memoryUsageHistory.length > 20) {
        this.memoryUsageHistory.shift();
      }
      
      this.detectMemoryLeaks();
    }
  }

  private detectMemoryLeaks(): void {
    if (this.memoryUsageHistory.length < 10) return;

    const recent = this.memoryUsageHistory.slice(-5);
    const older = this.memoryUsageHistory.slice(-10, -5);
    
    const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b) / older.length;
    
    const growthRate = (recentAvg - olderAvg) / olderAvg;
    
    if (growthRate > 0.1) { // 10% growth
      console.warn('Potential memory leak detected. Growth rate:', growthRate);
    }
  }

  getMemoryStats(): any {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: this.formatBytes(memory.usedJSHeapSize),
        totalJSHeapSize: this.formatBytes(memory.totalJSHeapSize),
        jsHeapSizeLimit: this.formatBytes(memory.jsHeapSizeLimit),
        usagePercentage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2)
      };
    }
    return null;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
```

---

## Bundle Optimization

### Webpack Bundle Analyzer Setup
```typescript
// angular.json - Add bundle analyzer
{
  "projects": {
    "mangacount-angular": {
      "architect": {
        "build": {
          "configurations": {
            "analyze": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "2mb",
                  "maximumError": "5mb"
                }
              ],
              "sourceMap": true,
              "namedChunks": true
            }
          }
        }
      }
    }
  }
}
```

### Tree Shaking Optimization
```typescript
// src/app/shared/utils/tree-shaking.ts
// Use specific imports instead of barrel imports
// Good:
import { map } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

// Avoid:
import * as rxjs from 'rxjs';

// For lodash, use specific function imports
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';

// Instead of:
// import * as _ from 'lodash';
```

### Lazy Loading Implementation
```typescript
// src/app/app-routing.module.ts
const routes: Routes = [
  {
    path: 'profiles',
    loadChildren: () => import('./features/profile-selection/profile-selection.module')
      .then(m => m.ProfileSelectionModule)
  },
  {
    path: 'collection',
    loadChildren: () => import('./features/collection-management/collection.module')
      .then(m => m.CollectionModule)
  },
  {
    path: 'settings',
    loadChildren: () => import('./features/settings/settings.module')
      .then(m => m.SettingsModule)
  }
];

// Preloading strategy for better UX
@Injectable()
export class CustomPreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // Preload important routes
    if (route.data && route.data['preload']) {
      return load();
    }
    return of(null);
  }
}
```

### Component-Level Code Splitting
```typescript
// src/app/features/collection-management/components/collection-view/collection-view.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-collection-view',
  template: `
    <div class="collection-controls">
      <!-- Lazy load heavy components -->
      <ng-container *ngIf="showAdvancedFilters">
        <app-advanced-filters 
          *ngIf="advancedFiltersLoaded; else loadingFilters"
          [entries]="entries">
        </app-advanced-filters>
        <ng-template #loadingFilters>
          <app-loading-spinner></app-loading-spinner>
        </ng-template>
      </ng-container>
    </div>
  `
})
export class CollectionViewComponent {
  showAdvancedFilters = false;
  advancedFiltersLoaded = false;

  async toggleAdvancedFilters(): Promise<void> {
    this.showAdvancedFilters = !this.showAdvancedFilters;
    
    if (this.showAdvancedFilters && !this.advancedFiltersLoaded) {
      // Dynamically import heavy component
      const { AdvancedFiltersComponent } = await import('../advanced-filters/advanced-filters.component');
      this.advancedFiltersLoaded = true;
    }
  }
}
```

---

## Runtime Performance

### Virtual Scrolling for Large Lists
```typescript
// src/app/features/collection-management/components/virtual-collection/virtual-collection.component.ts
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { Entry } from '../../../../shared/models';

@Component({
  selector: 'app-virtual-collection',
  template: `
    <cdk-virtual-scroll-viewport itemSize="80" class="viewport">
      <div *cdkVirtualFor="let entry of entries; trackBy: trackByFn" 
           class="entry-item">
        <app-entry-card [entry]="entry"></app-entry-card>
      </div>
    </cdk-virtual-scroll-viewport>
  `,
  styleUrls: ['./virtual-collection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VirtualCollectionComponent {
  @Input() entries: Entry[] = [];

  trackByFn(index: number, entry: Entry): number {
    return entry.id;
  }
}
```

### Optimized Image Loading
```typescript
// src/app/shared/directives/lazy-image.directive.ts
import { Directive, ElementRef, Input, Renderer2, OnInit } from '@angular/core';

@Directive({
  selector: '[appLazyImage]'
})
export class LazyImageDirective implements OnInit {
  @Input() appLazyImage!: string;
  @Input() placeholder = '/assets/images/placeholder.png';

  private observer!: IntersectionObserver;

  constructor(
    private el: ElementRef<HTMLImageElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.renderer.setAttribute(this.el.nativeElement, 'src', this.placeholder);
    
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage();
            this.observer.unobserve(this.el.nativeElement);
          }
        });
      },
      { threshold: 0.1 }
    );

    this.observer.observe(this.el.nativeElement);
  }

  private loadImage(): void {
    const img = new Image();
    img.onload = () => {
      this.renderer.setAttribute(this.el.nativeElement, 'src', this.appLazyImage);
      this.renderer.addClass(this.el.nativeElement, 'loaded');
    };
    img.onerror = () => {
      this.renderer.addClass(this.el.nativeElement, 'error');
    };
    img.src = this.appLazyImage;
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
```

### Debounced Search Implementation
```typescript
// src/app/features/collection-management/components/search/search.component.ts
import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-search',
  template: `
    <input 
      type="text" 
      [formControl]="searchControl" 
      placeholder="Search manga..."
      class="search-input">
  `,
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit, OnDestroy {
  @Output() search = new EventEmitter<string>();

  searchControl = new FormControl('');
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300), // Wait 300ms after user stops typing
      distinctUntilChanged(), // Only emit if value actually changed
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.search.emit(searchTerm || '');
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## Component Optimization

### Pure Pipes for Heavy Calculations
```typescript
// src/app/shared/pipes/collection-filter.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { Entry, FilterBy } from '../models';

@Pipe({
  name: 'collectionFilter',
  pure: true // Pure pipe for better performance
})
export class CollectionFilterPipe implements PipeTransform {
  transform(entries: Entry[], filter: FilterBy): Entry[] {
    if (!entries || filter === 'all') {
      return entries;
    }

    return entries.filter(entry => {
      switch (filter) {
        case 'complete':
          return entry.manga.volumes && entry.quantity >= entry.manga.volumes;
        case 'incomplete':
          return !entry.manga.volumes || entry.quantity < entry.manga.volumes;
        case 'priority':
          return entry.priority;
        case 'pending':
          return !!entry.pending;
        default:
          return true;
      }
    });
  }
}

// src/app/shared/pipes/completion-percentage.pipe.ts
@Pipe({
  name: 'completionPercentage',
  pure: true
})
export class CompletionPercentagePipe implements PipeTransform {
  transform(entry: Entry): number | null {
    if (!entry.manga.volumes || entry.manga.volumes === 0) {
      return null;
    }
    return Math.round((entry.quantity / entry.manga.volumes) * 100);
  }
}
```

### Optimized Event Handling
```typescript
// src/app/features/collection-management/components/entry-table/entry-table.component.ts
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import { Entry } from '../../../../shared/models';

@Component({
  selector: 'app-entry-table',
  template: `
    <table class="entries-table">
      <tbody>
        <tr *ngFor="let entry of entries; trackBy: trackByEntryId">
          <td>{{ entry.manga.name }}</td>
          <td>
            <div class="quantity-controls">
              <button 
                (click)="onQuantityChange(entry, entry.quantity - 1)"
                [disabled]="entry.quantity <= 0">
                -
              </button>
              <span>{{ entry.quantity }}</span>
              <button 
                (click)="onQuantityChange(entry, entry.quantity + 1)">
                +
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntryTableComponent {
  @Input() entries: Entry[] = [];
  @Output() quantityChange = new EventEmitter<{entry: Entry, quantity: number}>();

  private quantityChangeSubject = new Subject<{entry: Entry, quantity: number}>();

  constructor() {
    // Debounce quantity changes to prevent excessive API calls
    this.quantityChangeSubject.pipe(
      debounceTime(500)
    ).subscribe(change => {
      this.quantityChange.emit(change);
    });
  }

  onQuantityChange(entry: Entry, newQuantity: number): void {
    if (newQuantity >= 0) {
      this.quantityChangeSubject.next({ entry, quantity: newQuantity });
    }
  }

  trackByEntryId(index: number, entry: Entry): number {
    return entry.id;
  }
}
```

---

## Service Worker Implementation

### Service Worker Configuration
```typescript
// src/app/core/services/sw-update.service.ts
import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class SwUpdateService {
  constructor(
    private swUpdate: SwUpdate,
    private notificationService: NotificationService
  ) {
    if (swUpdate.isEnabled) {
      this.checkForUpdates();
      this.handleUpdates();
    }
  }

  private checkForUpdates(): void {
    // Check for updates every 30 seconds
    setInterval(() => {
      this.swUpdate.checkForUpdate();
    }, 30000);
  }

  private handleUpdates(): void {
    this.swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
    ).subscribe(() => {
      const shouldUpdate = confirm(
        'A new version is available. Would you like to update now?'
      );
      
      if (shouldUpdate) {
        this.activateUpdate();
      }
    });
  }

  private activateUpdate(): void {
    this.swUpdate.activateUpdate().then(() => {
      this.notificationService.showSuccess('Application updated successfully!');
      window.location.reload();
    });
  }
}
```

---

## Performance Monitoring

### Web Vitals Tracking
```typescript
// src/app/core/services/web-vitals.service.ts
import { Injectable } from '@angular/core';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

@Injectable({
  providedIn: 'root'
})
export class WebVitalsService {
  constructor() {
    this.initializeWebVitals();
  }

  private initializeWebVitals(): void {
    getCLS(this.onCLS.bind(this));
    getFID(this.onFID.bind(this));
    getFCP(this.onFCP.bind(this));
    getLCP(this.onLCP.bind(this));
    getTTFB(this.onTTFB.bind(this));
  }

  private onCLS(metric: any): void {
    console.log('CLS (Cumulative Layout Shift):', metric);
    this.sendToAnalytics('CLS', metric.value);
  }

  private onFID(metric: any): void {
    console.log('FID (First Input Delay):', metric);
    this.sendToAnalytics('FID', metric.value);
  }

  private onFCP(metric: any): void {
    console.log('FCP (First Contentful Paint):', metric);
    this.sendToAnalytics('FCP', metric.value);
  }

  private onLCP(metric: any): void {
    console.log('LCP (Largest Contentful Paint):', metric);
    this.sendToAnalytics('LCP', metric.value);
  }

  private onTTFB(metric: any): void {
    console.log('TTFB (Time to First Byte):', metric);
    this.sendToAnalytics('TTFB', metric.value);
  }

  private sendToAnalytics(metric: string, value: number): void {
    // Send to your analytics service
    console.log(`${metric}: ${value}`);
    
    // Example: Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', metric, {
        event_category: 'Web Vitals',
        value: Math.round(value),
        non_interaction: true
      });
    }
  }
}
```

### Performance Budget Configuration
```json
// angular.json - Performance budgets
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "2mb",
      "maximumError": "5mb"
    },
    {
      "type": "anyComponentStyle",
      "maximumWarning": "6kb",
      "maximumError": "10kb"
    },
    {
      "type": "bundle",
      "name": "vendor",
      "maximumWarning": "1mb",
      "maximumError": "2mb"
    }
  ]
}
```

This comprehensive performance guide ensures that the Angular MangaCount application will be highly optimized while maintaining all the functionality of the original React version, with improved performance characteristics through Angular's advanced optimization features.