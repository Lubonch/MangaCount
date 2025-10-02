# Testing Strategy & Implementation Guide

## Overview
This document outlines a comprehensive testing strategy for the Angular MangaCount application, including unit tests, integration tests, component testing, and end-to-end testing patterns that ensure the migrated application maintains the same functionality as the React version.

## Table of Contents
1. [Testing Architecture Overview](#testing-architecture-overview)
2. [Unit Testing Strategy](#unit-testing-strategy)
3. [Component Testing Patterns](#component-testing-patterns)
4. [Service Testing](#service-testing)
5. [Integration Testing](#integration-testing)
6. [End-to-End Testing](#end-to-end-testing)
7. [Testing Utilities & Helpers](#testing-utilities--helpers)
8. [Continuous Integration Setup](#continuous-integration-setup)

---

## Testing Architecture Overview

### Testing Tools Stack
```json
{
  "testingFramework": "Jasmine",
  "testRunner": "Karma",
  "e2eFramework": "Cypress",
  "utilities": [
    "@angular/testing",
    "@testing-library/angular",
    "jest-preset-angular",
    "cypress-testing-library"
  ],
  "coverage": "Istanbul/NYC"
}
```

### Testing File Structure
```
src/
??? app/
?   ??? [feature]/
?   ?   ??? components/
?   ?   ?   ??? component.spec.ts
?   ?   ?   ??? component.ts
?   ?   ??? services/
?   ?   ?   ??? service.spec.ts
?   ?   ?   ??? service.ts
?   ?   ??? [feature].module.spec.ts
?   ??? testing/
?       ??? mocks/
?       ??? fixtures/
?       ??? helpers/
?       ??? test-utilities.ts
??? cypress/
?   ??? e2e/
?   ??? fixtures/
?   ??? support/
?   ??? cypress.config.ts
??? karma.conf.js
```

---

## Unit Testing Strategy

### Testing Configuration
```typescript
// src/test-setup.ts
import 'zone.js/dist/zone-testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);

// Global test configuration
beforeEach(() => {
  // Reset any global state
  localStorage.clear();
  sessionStorage.clear();
});
```

### Service Testing Patterns

#### Data Service Testing
```typescript
// src/app/core/services/data.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DataService } from './data.service';
import { Profile, Entry, Manga } from '../../shared/models';
import { PROFILE_ENDPOINTS, ENTRY_ENDPOINTS } from '../config/api.config';

describe('DataService', () => {
  let service: DataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataService]
    });
    
    service = TestBed.inject(DataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Profile operations', () => {
    it('should get all profiles', () => {
      const mockProfiles: Profile[] = [
        { id: 1, name: 'Test User 1' },
        { id: 2, name: 'Test User 2' }
      ];

      service.getProfiles().subscribe(profiles => {
        expect(profiles).toEqual(mockProfiles);
        expect(profiles.length).toBe(2);
      });

      const req = httpMock.expectOne(PROFILE_ENDPOINTS.getAll);
      expect(req.request.method).toBe('GET');
      req.flush(mockProfiles);
    });

    it('should create a new profile', () => {
      const newProfile = { name: 'New User' };
      const createdProfile: Profile = { id: 3, name: 'New User' };

      service.createProfile(newProfile).subscribe(profile => {
        expect(profile).toEqual(createdProfile);
      });

      const req = httpMock.expectOne(PROFILE_ENDPOINTS.create);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newProfile);
      req.flush(createdProfile);
    });

    it('should handle profile creation error', () => {
      const newProfile = { name: '' };
      const errorResponse = { status: 400, statusText: 'Bad Request' };

      service.createProfile(newProfile).subscribe({
        next: () => fail('Expected an error'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne(PROFILE_ENDPOINTS.create);
      req.flush('Invalid profile name', errorResponse);
    });
  });

  describe('Entry operations', () => {
    it('should get entries for a profile', () => {
      const profileId = 1;
      const mockEntries: Entry[] = [
        {
          id: 1,
          mangaId: 1,
          profileId: 1,
          quantity: 5,
          priority: false,
          manga: { id: 1, name: 'Test Manga', formatId: 1, publisherId: 1 }
        }
      ];

      service.getEntries(profileId).subscribe(entries => {
        expect(entries).toEqual(mockEntries);
      });

      const req = httpMock.expectOne(ENTRY_ENDPOINTS.getByProfile(profileId));
      expect(req.request.method).toBe('GET');
      req.flush(mockEntries);
    });

    it('should update entry quantity', () => {
      const entryId = 1;
      const newQuantity = 10;
      const updatedEntry: Entry = {
        id: 1,
        mangaId: 1,
        profileId: 1,
        quantity: newQuantity,
        priority: false,
        manga: { id: 1, name: 'Test Manga', formatId: 1, publisherId: 1 }
      };

      service.updateEntryQuantity(entryId, newQuantity).subscribe(entry => {
        expect(entry.quantity).toBe(newQuantity);
      });

      const req = httpMock.expectOne(ENTRY_ENDPOINTS.updateQuantity(entryId));
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ id: entryId, quantity: newQuantity });
      req.flush(updatedEntry);
    });
  });

  describe('File upload operations', () => {
    it('should import entries from TSV file', () => {
      const profileId = 1;
      const file = new File(['test content'], 'test.tsv', { type: 'text/tab-separated-values' });
      const importResult = {
        success: true,
        message: 'Import successful',
        importedCount: 5,
        errorCount: 0
      };

      service.importEntries(file, profileId).subscribe(result => {
        expect(result).toEqual(importResult);
      });

      const req = httpMock.expectOne(ENTRY_ENDPOINTS.import(profileId));
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTruthy();
      req.flush(importResult);
    });
  });
});
```

#### Theme Service Testing
```typescript
// src/app/core/services/theme.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    mockLocalStorage = {};
    
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      return mockLocalStorage[key] || null;
    });
    
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });

    TestBed.configureTestingModule({
      providers: [ThemeService]
    });
    
    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default to dark theme', () => {
    expect(service.currentTheme).toBe('dark');
  });

  it('should toggle theme from dark to light', () => {
    expect(service.currentTheme).toBe('dark');
    
    service.toggleTheme();
    
    expect(service.currentTheme).toBe('light');
    expect(localStorage.setItem).toHaveBeenCalledWith('mangacount-theme', 'light');
  });

  it('should toggle theme from light to dark', () => {
    mockLocalStorage['mangacount-theme'] = 'light';
    service = TestBed.inject(ThemeService); // Reinitialize to pick up stored value
    
    expect(service.currentTheme).toBe('light');
    
    service.toggleTheme();
    
    expect(service.currentTheme).toBe('dark');
  });

  it('should emit theme changes', () => {
    let emittedTheme: boolean | undefined;
    
    service.isDarkMode$.subscribe(isDark => {
      emittedTheme = isDark;
    });
    
    service.setTheme(false);
    
    expect(emittedTheme).toBe(false);
  });

  it('should apply theme to document', () => {
    spyOn(document.documentElement, 'setAttribute');
    
    service.setTheme(false);
    
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });
});
```

---

## Component Testing Patterns

### Testing Utilities Setup
```typescript
// src/app/testing/test-utilities.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { SharedModule } from '../shared/shared.module';

export interface TestSetup<T> {
  component: T;
  fixture: ComponentFixture<T>;
  debugElement: DebugElement;
}

export class ComponentTestHelper {
  static async createComponent<T>(
    componentType: new (...args: any[]) => T,
    declarations: any[] = [],
    imports: any[] = [],
    providers: any[] = []
  ): Promise<TestSetup<T>> {
    await TestBed.configureTestingModule({
      declarations: [componentType, ...declarations],
      imports: [
        NoopAnimationsModule,
        HttpClientTestingModule,
        RouterTestingModule,
        SharedModule,
        ...imports
      ],
      providers: [...providers]
    }).compileComponents();

    const fixture = TestBed.createComponent(componentType);
    const component = fixture.componentInstance;
    const debugElement = fixture.debugElement;

    return { component, fixture, debugElement };
  }

  static clickElement(fixture: ComponentFixture<any>, selector: string): void {
    const element = fixture.debugElement.query(By.css(selector));
    if (element) {
      element.nativeElement.click();
      fixture.detectChanges();
    }
  }

  static typeInInput(fixture: ComponentFixture<any>, selector: string, value: string): void {
    const input = fixture.debugElement.query(By.css(selector));
    if (input) {
      input.nativeElement.value = value;
      input.nativeElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }
  }

  static expectElementToExist(fixture: ComponentFixture<any>, selector: string): void {
    const element = fixture.debugElement.query(By.css(selector));
    expect(element).toBeTruthy();
  }

  static expectElementNotToExist(fixture: ComponentFixture<any>, selector: string): void {
    const element = fixture.debugElement.query(By.css(selector));
    expect(element).toBeFalsy();
  }

  static expectTextContent(fixture: ComponentFixture<any>, selector: string, expectedText: string): void {
    const element = fixture.debugElement.query(By.css(selector));
    expect(element?.nativeElement.textContent?.trim()).toBe(expectedText);
  }
}
```

### Component Testing Examples

#### Profile Selector Component Test
```typescript
// src/app/features/profile-selection/components/profile-selector/profile-selector.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProfileSelectorComponent } from './profile-selector.component';
import { ProfileService } from '../../../../core/services/profile.service';
import { ComponentTestHelper } from '../../../../testing/test-utilities';
import { Profile } from '../../../../shared/models';

describe('ProfileSelectorComponent', () => {
  let component: ProfileSelectorComponent;
  let fixture: ComponentFixture<ProfileSelectorComponent>;
  let mockProfileService: jasmine.SpyObj<ProfileService>;

  const mockProfiles: Profile[] = [
    { id: 1, name: 'Test User 1' },
    { id: 2, name: 'Test User 2' },
    { id: 3, name: 'Test User 3' }
  ];

  beforeEach(async () => {
    const profileServiceSpy = jasmine.createSpyObj('ProfileService', [
      'loadProfiles',
      'selectProfile',
      'deleteProfile'
    ], {
      profiles$: of(mockProfiles)
    });

    const setup = await ComponentTestHelper.createComponent(
      ProfileSelectorComponent,
      [],
      [],
      [{ provide: ProfileService, useValue: profileServiceSpy }]
    );

    component = setup.component;
    fixture = setup.fixture;
    mockProfileService = TestBed.inject(ProfileService) as jasmine.SpyObj<ProfileService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load profiles on init', () => {
    mockProfileService.loadProfiles.and.returnValue(Promise.resolve(mockProfiles));
    
    component.ngOnInit();
    
    expect(mockProfileService.loadProfiles).toHaveBeenCalled();
  });

  it('should display all profiles', () => {
    fixture.detectChanges();
    
    const profileElements = fixture.debugElement.queryAll(By.css('.profile-circle'));
    expect(profileElements.length).toBe(mockProfiles.length);
  });

  it('should display profile names', () => {
    fixture.detectChanges();
    
    mockProfiles.forEach((profile, index) => {
      ComponentTestHelper.expectTextContent(
        fixture,
        `.profile-circle:nth-child(${index + 1}) .profile-circle-name`,
        profile.name
      );
    });
  });

  it('should emit profileSelect when profile is clicked', () => {
    spyOn(component.profileSelect, 'emit');
    fixture.detectChanges();
    
    ComponentTestHelper.clickElement(fixture, '.profile-circle:first-child .profile-circle-avatar');
    
    expect(component.profileSelect.emit).toHaveBeenCalledWith(mockProfiles[0]);
  });

  it('should show add new profile option', () => {
    fixture.detectChanges();
    
    ComponentTestHelper.expectElementToExist(fixture, '.add-profile-circle');
    ComponentTestHelper.expectTextContent(fixture, '.add-profile-circle .profile-circle-name', 'Add New');
  });

  it('should open add profile modal when add new is clicked', () => {
    fixture.detectChanges();
    
    ComponentTestHelper.clickElement(fixture, '.add-profile-circle');
    
    expect(component.showAddProfile).toBe(true);
  });

  it('should show edit and delete buttons on hover', () => {
    fixture.detectChanges();
    
    const profileCircle = fixture.debugElement.query(By.css('.profile-circle:first-child'));
    profileCircle.nativeElement.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    
    ComponentTestHelper.expectElementToExist(fixture, '.profile-action-buttons');
    ComponentTestHelper.expectElementToExist(fixture, '.edit-btn');
    ComponentTestHelper.expectElementToExist(fixture, '.delete-btn');
  });

  it('should delete profile when delete button is clicked', () => {
    mockProfileService.deleteProfile.and.returnValue(Promise.resolve());
    spyOn(window, 'confirm').and.returnValue(true);
    fixture.detectChanges();
    
    ComponentTestHelper.clickElement(fixture, '.profile-circle:first-child .delete-btn');
    
    expect(mockProfileService.deleteProfile).toHaveBeenCalledWith(mockProfiles[0].id);
  });

  it('should not delete profile if user cancels confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    fixture.detectChanges();
    
    ComponentTestHelper.clickElement(fixture, '.profile-circle:first-child .delete-btn');
    
    expect(mockProfileService.deleteProfile).not.toHaveBeenCalled();
  });

  it('should show loading state while loading profiles', () => {
    component.loading = true;
    fixture.detectChanges();
    
    ComponentTestHelper.expectElementToExist(fixture, '.loading-container');
    ComponentTestHelper.expectTextContent(fixture, '.loading-container p', 'Loading profiles...');
  });

  it('should show error state when error occurs', () => {
    component.error = 'Failed to load profiles';
    fixture.detectChanges();
    
    ComponentTestHelper.expectElementToExist(fixture, '.error-container');
    ComponentTestHelper.expectTextContent(fixture, '.error-container p', 'Failed to load profiles');
  });
});
```

#### Collection View Component Test
```typescript
// src/app/features/collection-management/components/collection-view/collection-view.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CollectionViewComponent } from './collection-view.component';
import { DataService } from '../../../../core/services/data.service';
import { ComponentTestHelper } from '../../../../testing/test-utilities';
import { Entry, Manga, Profile } from '../../../../shared/models';

describe('CollectionViewComponent', () => {
  let component: CollectionViewComponent;
  let fixture: ComponentFixture<CollectionViewComponent>;
  let mockDataService: jasmine.SpyObj<DataService>;

  const mockProfile: Profile = { id: 1, name: 'Test User' };
  const mockManga: Manga = {
    id: 1,
    name: 'Test Manga',
    volumes: 10,
    formatId: 1,
    publisherId: 1,
    format: { id: 1, name: 'Paperback' },
    publisher: { id: 1, name: 'Test Publisher' }
  };
  const mockEntries: Entry[] = [
    {
      id: 1,
      mangaId: 1,
      profileId: 1,
      quantity: 5,
      priority: false,
      manga: mockManga
    },
    {
      id: 2,
      mangaId: 1,
      profileId: 1,
      quantity: 10,
      priority: true,
      manga: { ...mockManga, id: 2, name: 'Another Manga', volumes: 10 }
    }
  ];

  beforeEach(async () => {
    const dataServiceSpy = jasmine.createSpyObj('DataService', [
      'getPublishersForProfile',
      'getFormatsForProfile'
    ]);

    const setup = await ComponentTestHelper.createComponent(
      CollectionViewComponent,
      [],
      [],
      [{ provide: DataService, useValue: dataServiceSpy }]
    );

    component = setup.component;
    fixture = setup.fixture;
    mockDataService = TestBed.inject(DataService) as jasmine.SpyObj<DataService>;

    // Set component inputs
    component.entries = mockEntries;
    component.mangas = [mockManga];
    component.selectedProfile = mockProfile;
    component.loading = false;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display collection statistics', () => {
    fixture.detectChanges();
    
    ComponentTestHelper.expectTextContent(
      fixture,
      '.collection-stats',
      `${mockEntries.length} total entries • ${mockEntries.length} shown • 15 volumes total`
    );
  });

  it('should display status summary', () => {
    fixture.detectChanges();
    
    const statusCounts = component.getStatusCounts();
    ComponentTestHelper.expectTextContent(
      fixture,
      '.status-count.complete .text',
      `Complete: ${statusCounts.complete}`
    );
  });

  it('should filter entries by status', () => {
    component.filter = 'complete';
    const filtered = component.getFilteredEntries();
    
    expect(filtered.length).toBe(1);
    expect(filtered[0].quantity).toBe(10); // Complete entry
  });

  it('should filter entries by priority', () => {
    component.filter = 'priority';
    const filtered = component.getFilteredEntries();
    
    expect(filtered.length).toBe(1);
    expect(filtered[0].priority).toBe(true);
  });

  it('should sort entries by name', () => {
    component.sortBy = 'name';
    const sorted = component.getSortedEntries();
    
    expect(sorted[0].manga.name).toBe('Another Manga');
    expect(sorted[1].manga.name).toBe('Test Manga');
  });

  it('should sort entries by completion percentage', () => {
    component.sortBy = 'completion';
    const sorted = component.getSortedEntries();
    
    // Entry with 10/10 volumes should come first (100%)
    expect(sorted[0].quantity).toBe(10);
    expect(sorted[1].quantity).toBe(5);
  });

  it('should calculate completion percentage correctly', () => {
    const completeEntry = mockEntries[1]; // 10/10 volumes
    const incompleteEntry = mockEntries[0]; // 5/10 volumes
    
    expect(component.getCompletionPercentage(completeEntry)).toBe(100);
    expect(component.getCompletionPercentage(incompleteEntry)).toBe(50);
  });

  it('should determine entry status correctly', () => {
    const completeEntry = mockEntries[1]; // 10/10 volumes
    const priorityEntry = { ...mockEntries[0], priority: true }; // 5/10 volumes, priority
    const incompleteEntry = mockEntries[0]; // 5/10 volumes, not priority
    
    expect(component.getEntryStatus(completeEntry)).toBe('complete');
    expect(component.getEntryStatus(priorityEntry)).toBe('priority-incomplete');
    expect(component.getEntryStatus(incompleteEntry)).toBe('incomplete');
  });

  it('should switch view modes', () => {
    component.viewMode = 'table';
    fixture.detectChanges();
    ComponentTestHelper.expectElementToExist(fixture, '.table-container');
    
    component.viewMode = 'cards';
    fixture.detectChanges();
    ComponentTestHelper.expectElementToExist(fixture, '.entries-grid');
    
    component.viewMode = 'compact';
    fixture.detectChanges();
    ComponentTestHelper.expectElementToExist(fixture, '.compact-grid');
  });

  it('should show loading skeleton when loading', () => {
    component.loading = true;
    fixture.detectChanges();
    
    ComponentTestHelper.expectElementToExist(fixture, '.skeleton-loading');
  });

  it('should show empty state when no entries match filter', () => {
    component.entries = [];
    fixture.detectChanges();
    
    ComponentTestHelper.expectElementToExist(fixture, '.empty-collection');
    ComponentTestHelper.expectTextContent(
      fixture,
      '.empty-collection p',
      'No entries found for the selected filters.'
    );
  });

  it('should emit refresh event when refresh button is clicked', () => {
    spyOn(component.refresh, 'emit');
    fixture.detectChanges();
    
    ComponentTestHelper.clickElement(fixture, '.refresh-button');
    
    expect(component.refresh.emit).toHaveBeenCalled();
  });

  it('should clear all filters when clear filters button is clicked', () => {
    component.filter = 'complete';
    component.publisherFilter = '1';
    component.formatFilter = '1';
    fixture.detectChanges();
    
    ComponentTestHelper.clickElement(fixture, '.clear-filters-btn');
    
    expect(component.filter).toBe('all');
    expect(component.publisherFilter).toBe('all');
    expect(component.formatFilter).toBe('all');
  });
});
```

### Modal Component Testing
```typescript
// src/app/features/modals/add-entry-modal/add-entry-modal.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { AddEntryModalComponent } from './add-entry-modal.component';
import { DataService } from '../../../core/services/data.service';
import { ComponentTestHelper } from '../../../testing/test-utilities';

describe('AddEntryModalComponent', () => {
  let component: AddEntryModalComponent;
  let fixture: ComponentFixture<AddEntryModalComponent>;
  let mockDataService: jasmine.SpyObj<DataService>;

  beforeEach(async () => {
    const dataServiceSpy = jasmine.createSpyObj('DataService', ['saveEntry']);

    const setup = await ComponentTestHelper.createComponent(
      AddEntryModalComponent,
      [],
      [ReactiveFormsModule],
      [{ provide: DataService, useValue: dataServiceSpy }]
    );

    component = setup.component;
    fixture = setup.fixture;
    mockDataService = TestBed.inject(DataService) as jasmine.SpyObj<DataService>;

    // Set required inputs
    component.isOpen = true;
    component.mangas = [
      { id: 1, name: 'Test Manga', formatId: 1, publisherId: 1 }
    ];
    component.selectedProfile = { id: 1, name: 'Test User' };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    component.ngOnInit();
    
    expect(component.entryForm.get('mangaId')?.value).toBe('');
    expect(component.entryForm.get('quantity')?.value).toBe(1);
    expect(component.entryForm.get('pending')?.value).toBe('');
    expect(component.entryForm.get('priority')?.value).toBe(false);
  });

  it('should validate required fields', () => {
    component.ngOnInit();
    fixture.detectChanges();
    
    // Try to submit without manga selection
    ComponentTestHelper.clickElement(fixture, '.submit-button');
    
    expect(component.entryForm.invalid).toBe(true);
    expect(component.entryForm.get('mangaId')?.errors?.['required']).toBeTruthy();
  });

  it('should validate quantity field', () => {
    component.ngOnInit();
    
    // Test negative quantity
    component.entryForm.get('quantity')?.setValue(-1);
    expect(component.entryForm.get('quantity')?.errors?.['min']).toBeTruthy();
    
    // Test zero quantity
    component.entryForm.get('quantity')?.setValue(0);
    expect(component.entryForm.get('quantity')?.errors?.['min']).toBeTruthy();
    
    // Test valid quantity
    component.entryForm.get('quantity')?.setValue(5);
    expect(component.entryForm.get('quantity')?.errors).toBeNull();
  });

  it('should submit form with valid data', () => {
    const mockEntry = {
      id: 1,
      mangaId: 1,
      profileId: 1,
      quantity: 5,
      priority: false,
      manga: component.mangas[0]
    };
    
    mockDataService.saveEntry.and.returnValue(of(mockEntry));
    spyOn(component.success, 'emit');
    
    component.ngOnInit();
    component.entryForm.patchValue({
      mangaId: 1,
      quantity: 5,
      pending: '',
      priority: false
    });
    
    ComponentTestHelper.clickElement(fixture, '.submit-button');
    
    expect(mockDataService.saveEntry).toHaveBeenCalled();
    expect(component.success.emit).toHaveBeenCalled();
  });

  it('should close modal when close button is clicked', () => {
    spyOn(component.close, 'emit');
    fixture.detectChanges();
    
    ComponentTestHelper.clickElement(fixture, '.close-button');
    
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should populate form when editing existing entry', () => {
    const editEntry = {
      id: 1,
      mangaId: 1,
      profileId: 1,
      quantity: 5,
      pending: 'Next week',
      priority: true,
      manga: component.mangas[0]
    };
    
    component.editEntry = editEntry;
    component.ngOnInit();
    
    expect(component.entryForm.get('mangaId')?.value).toBe(1);
    expect(component.entryForm.get('quantity')?.value).toBe(5);
    expect(component.entryForm.get('pending')?.value).toBe('Next week');
    expect(component.entryForm.get('priority')?.value).toBe(true);
  });
});
```

---

## Integration Testing

### Module Integration Tests
```typescript
// src/app/features/collection-management/collection.module.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { CollectionModule } from './collection.module';

@Component({
  template: '<router-outlet></router-outlet>'
})
class TestHostComponent {}

describe('CollectionModule Integration', () => {
  let router: Router;
  let location: Location;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestHostComponent],
      imports: [
        CollectionModule,
        RouterTestingModule.withRoutes([
          { path: 'collection', loadChildren: () => CollectionModule }
        ])
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    fixture = TestBed.createComponent(TestHostComponent);
  });

  it('should navigate to collection view', async () => {
    await router.navigate(['/collection']);
    expect(location.path()).toBe('/collection');
  });
});
```

---

## End-to-End Testing

### Cypress Configuration
```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000
  }
});
```

### E2E Test Examples
```typescript
// cypress/e2e/profile-selection.cy.ts
describe('Profile Selection', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/profile', { fixture: 'profiles.json' }).as('getProfiles');
    cy.visit('/profiles');
    cy.wait('@getProfiles');
  });

  it('should display available profiles', () => {
    cy.get('[data-cy=profile-circle]').should('have.length', 3);
    cy.get('[data-cy=profile-name]').first().should('contain', 'Test User 1');
  });

  it('should select a profile and navigate to collection', () => {
    cy.intercept('GET', '/api/entry?profileId=1', { fixture: 'entries.json' }).as('getEntries');
    cy.intercept('GET', '/api/manga', { fixture: 'manga.json' }).as('getManga');
    
    cy.get('[data-cy=profile-circle]').first().click();
    
    cy.wait('@getEntries');
    cy.wait('@getManga');
    cy.url().should('include', '/collection');
  });

  it('should create a new profile', () => {
    cy.intercept('POST', '/api/profile', { fixture: 'new-profile.json' }).as('createProfile');
    
    cy.get('[data-cy=add-profile-circle]').click();
    cy.get('[data-cy=profile-name-input]').type('New Test User');
    cy.get('[data-cy=create-profile-button]').click();
    
    cy.wait('@createProfile');
    cy.get('[data-cy=profile-circle]').should('have.length', 4);
  });
});

// cypress/e2e/collection-management.cy.ts
describe('Collection Management', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/profile', { fixture: 'profiles.json' }).as('getProfiles');
    cy.intercept('GET', '/api/entry?profileId=1', { fixture: 'entries.json' }).as('getEntries');
    cy.intercept('GET', '/api/manga', { fixture: 'manga.json' }).as('getManga');
    
    cy.visit('/profiles');
    cy.wait('@getProfiles');
    cy.get('[data-cy=profile-circle]').first().click();
    cy.wait(['@getEntries', '@getManga']);
  });

  it('should display collection entries', () => {
    cy.get('[data-cy=entry-row]').should('have.length.greaterThan', 0);
    cy.get('[data-cy=collection-stats]').should('contain', 'total entries');
  });

  it('should filter entries by status', () => {
    cy.get('[data-cy=status-filter]').select('complete');
    cy.get('[data-cy=entry-row]').should('have.length.lessThan', 10);
    
    cy.get('[data-cy=status-filter]').select('all');
    cy.get('[data-cy=entry-row]').should('have.length.greaterThan', 5);
  });

  it('should switch view modes', () => {
    // Test table view
    cy.get('[data-cy=view-mode-select]').select('table');
    cy.get('[data-cy=table-container]').should('be.visible');
    
    // Test cards view
    cy.get('[data-cy=view-mode-select]').select('cards');
    cy.get('[data-cy=entries-grid]').should('be.visible');
    
    // Test compact view
    cy.get('[data-cy=view-mode-select]').select('compact');
    cy.get('[data-cy=compact-grid]').should('be.visible');
  });

  it('should add a new entry', () => {
    cy.intercept('POST', '/api/entry', { fixture: 'new-entry.json' }).as('createEntry');
    
    cy.get('[data-cy=add-entry-button]').click();
    cy.get('[data-cy=manga-select]').select('Test Manga');
    cy.get('[data-cy=quantity-input]').clear().type('5');
    cy.get('[data-cy=submit-entry-button]').click();
    
    cy.wait('@createEntry');
    cy.get('[data-cy=entry-row]').should('contain', 'Test Manga');
  });

  it('should update entry quantity with quick buttons', () => {
    cy.intercept('PUT', '/api/entry/*/quantity', { fixture: 'updated-entry.json' }).as('updateQuantity');
    
    cy.get('[data-cy=plus-one-button]').first().click();
    
    cy.wait('@updateQuantity');
    // Verify UI updates
  });

  it('should import TSV file', () => {
    cy.intercept('POST', '/api/entry/import/1', { fixture: 'import-result.json' }).as('importFile');
    
    cy.get('[data-cy=file-input]').selectFile('cypress/fixtures/test-import.tsv');
    
    cy.wait('@importFile');
    cy.get('[data-cy=import-message]').should('contain', 'Import successful');
  });

  it('should handle theme switching', () => {
    cy.get('[data-cy=theme-toggle]').click();
    cy.get('html').should('have.attr', 'data-theme', 'light');
    
    cy.get('[data-cy=theme-toggle]').click();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
  });
});
```

### Test Fixtures
```json
// cypress/fixtures/profiles.json
[
  { "id": 1, "name": "Test User 1" },
  { "id": 2, "name": "Test User 2" },
  { "id": 3, "name": "Test User 3" }
]

// cypress/fixtures/entries.json
[
  {
    "id": 1,
    "mangaId": 1,
    "profileId": 1,
    "quantity": 5,
    "priority": false,
    "manga": {
      "id": 1,
      "name": "Attack on Titan",
      "volumes": 34,
      "format": { "id": 1, "name": "Paperback" },
      "publisher": { "id": 1, "name": "Kodansha" }
    }
  }
]
```

---

## Testing Utilities & Helpers

### Mock Data Factories
```typescript
// src/app/testing/mock-data.ts
export class MockDataFactory {
  static createProfile(overrides: Partial<Profile> = {}): Profile {
    return {
      id: 1,
      name: 'Test User',
      ...overrides
    };
  }

  static createManga(overrides: Partial<Manga> = {}): Manga {
    return {
      id: 1,
      name: 'Test Manga',
      volumes: 10,
      formatId: 1,
      publisherId: 1,
      format: { id: 1, name: 'Paperback' },
      publisher: { id: 1, name: 'Test Publisher' },
      ...overrides
    };
  }

  static createEntry(overrides: Partial<Entry> = {}): Entry {
    return {
      id: 1,
      mangaId: 1,
      profileId: 1,
      quantity: 5,
      priority: false,
      manga: this.createManga(),
      ...overrides
    };
  }

  static createProfiles(count: number): Profile[] {
    return Array.from({ length: count }, (_, i) =>
      this.createProfile({ id: i + 1, name: `Test User ${i + 1}` })
    );
  }

  static createEntries(count: number): Entry[] {
    return Array.from({ length: count }, (_, i) =>
      this.createEntry({ 
        id: i + 1, 
        mangaId: i + 1,
        manga: this.createManga({ id: i + 1, name: `Manga ${i + 1}` })
      })
    );
  }
}
```

---

## Continuous Integration Setup

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run unit tests
      run: npm run test:ci
    
    - name: Run e2e tests
      run: npm run e2e:ci
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  test-coverage:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Generate coverage report
      run: npm run test:coverage
    
    - name: Check coverage threshold
      run: npm run test:coverage:check
```

### Package.json Test Scripts
```json
{
  "scripts": {
    "test": "ng test",
    "test:ci": "ng test --watch=false --browsers=ChromeHeadless --code-coverage",
    "test:coverage": "ng test --code-coverage --watch=false",
    "test:coverage:check": "istanbul check-coverage --statements 80 --branches 80 --functions 80 --lines 80",
    "e2e": "cypress open",
    "e2e:ci": "cypress run",
    "e2e:headless": "cypress run --headless"
  }
}
```

This comprehensive testing guide ensures that the Angular migration maintains the same functionality and quality as the original React application while providing robust test coverage across all layers of the application.