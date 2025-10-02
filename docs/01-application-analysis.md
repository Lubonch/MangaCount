# MangaCount Application - Complete Technical Analysis

## Table of Contents
1. [Application Overview](#application-overview)
2. [Architecture Analysis](#architecture-analysis)
3. [Technical Stack](#technical-stack)
4. [Feature Analysis](#feature-analysis)
5. [Data Models](#data-models)
6. [API Endpoints](#api-endpoints)
7. [UI/UX Analysis](#ui-ux-analysis)
8. [State Management](#state-management)
9. [Routing & Navigation](#routing--navigation)
10. [Styling & Theming](#styling--theming)

## Application Overview

**MangaCount** is a comprehensive manga collection management application that allows users to:
- Create and manage multiple user profiles
- Track manga reading progress across different series
- Organize collections by publisher, format, and status
- Import/export collection data via TSV files
- Monitor completion percentages and prioritize reading
- Manage manga library with custom publishers and formats

## Architecture Analysis

### Client-Side Architecture (React)
```
mangacount.client/
??? src/
?   ??? components/          # UI Components
?   ?   ??? AddEntryModal.jsx         # Add/Edit reading entries
?   ?   ??? AddMangaModal.jsx         # Add/Edit manga to library
?   ?   ??? AddProfileModal.jsx       # User profile management
?   ?   ??? CollectionView.jsx        # Main collection display
?   ?   ??? LoadBearingCheck.jsx      # Infrastructure check (humorous)
?   ?   ??? LoadingSpinner.jsx        # Loading states
?   ?   ??? NukeDataModal.jsx         # Database reset functionality
?   ?   ??? ProfileSelector.jsx       # Profile selection interface
?   ?   ??? Sidebar.jsx               # Navigation and quick actions
?   ?   ??? ThemeToggle.jsx           # Dark/Light mode toggle
?   ??? contexts/
?   ?   ??? ThemeContext.jsx          # Theme state management
?   ??? test/                         # Test files
?   ??? App.jsx                       # Root component
?   ??? main.jsx                      # Application entry point
?   ??? index.css                     # Global styles
??? index.html                        # HTML template
??? package.json                      # Dependencies
??? vite.config.js                   # Build configuration
```

### Server-Side Architecture (.NET 8)
```
MangaCount.Server/
??? Controllers/              # API Controllers
??? Models/                   # Data models
??? Services/                 # Business logic
??? Data/                     # Database access
??? Properties/               # Launch settings
```

## Technical Stack

### Frontend (React)
- **Framework**: React 19.1.0
- **Build Tool**: Vite 7.0.4
- **Styling**: CSS Variables with theme system
- **Testing**: Vitest 2.1.8 + Testing Library
- **Language**: JavaScript (JSX)

### Backend (.NET 8)
- **Framework**: ASP.NET Core 8.0
- **Database**: SQL Server with Dapper ORM
- **API Documentation**: Swagger/OpenAPI
- **Architecture**: RESTful API
- **Mapping**: AutoMapper

### Development Tools
- **Package Manager**: npm
- **Code Quality**: ESLint
- **Version Control**: Git
- **IDE Support**: Visual Studio Code configurations

## Feature Analysis

### 1. Profile Management
- **Multi-user support**: Multiple profiles per application instance
- **Profile avatars**: Image upload and display with fallback initials
- **Profile switching**: Seamless switching between user profiles
- **Profile persistence**: Last selected profile remembered via localStorage

### 2. Collection Management
- **Reading entries**: Track owned volumes vs. total volumes
- **Progress tracking**: Visual progress bars and completion percentages
- **Status indicators**: Complete (?), Priority Incomplete (?), Incomplete (?)
- **Pending items**: Track items awaiting purchase/reading

### 3. Library Organization
- **Manga database**: Central library of all manga series
- **Publisher management**: Track and filter by publisher
- **Format management**: Different manga formats (Paperback, Digital, etc.)
- **Volume tracking**: Total volumes per series when known

### 4. Data Management
- **TSV Import**: Bulk import collection data
- **Real-time updates**: Immediate UI updates after changes
- **Data validation**: Form validation and error handling
- **Backup/Restore**: Nuclear option for complete data reset

### 5. User Interface Features
- **Multiple view modes**: Table, Compact, Cards
- **Advanced filtering**: By status, publisher, format
- **Sorting options**: Name, completion, quantity, priority, publisher, format
- **Quick actions**: +1 volume buttons, inline editing
- **Responsive design**: Mobile-friendly layouts

### 6. Theme System
- **Dark/Light modes**: Complete theme switching
- **CSS Variables**: Consistent color system
- **User preference**: Theme choice persisted in localStorage
- **Smooth transitions**: Animated theme changes

## Data Models

### Profile Model
```typescript
interface Profile {
    id: number;
    name: string;
    profilePicture?: string;
}
```

### Manga Model
```typescript
interface Manga {
    id: number;
    name: string;
    volumes?: number;
    formatId: number;
    format?: Format;
    publisherId: number;
    publisher?: Publisher;
}
```

### Entry Model
```typescript
interface Entry {
    id: number;
    mangaId: number;
    manga: Manga;
    profileId: number;
    quantity: number;
    pending?: string;
    priority: boolean;
}
```

### Format Model
```typescript
interface Format {
    id: number;
    name: string;
}
```

### Publisher Model
```typescript
interface Publisher {
    id: number;
    name: string;
}
```

## API Endpoints

### Profile Endpoints
- `GET /api/profile` - Get all profiles
- `POST /api/profile` - Create new profile
- `PUT /api/profile/{id}` - Update profile
- `DELETE /api/profile/{id}` - Delete profile

### Entry Endpoints
- `GET /api/entry?profileId={id}` - Get entries for profile
- `POST /api/entry` - Create/Update entry
- `POST /api/entry/import/{profileId}` - Import TSV file
- `GET /api/entry/filters/publishers?profileId={id}` - Get available publishers
- `GET /api/entry/filters/formats?profileId={id}` - Get available formats

### Manga Endpoints
- `GET /api/manga` - Get all manga
- `POST /api/manga` - Create manga
- `PUT /api/manga/{id}` - Update manga

### Format Endpoints
- `GET /api/format` - Get all formats
- `POST /api/format` - Create format

### Publisher Endpoints
- `GET /api/publisher` - Get all publishers
- `POST /api/publisher` - Create publisher

### System Endpoints
- `GET /api/loadbearing/status` - Infrastructure check
- `GET /api/database/statistics` - Database statistics
- `POST /api/database/nuke` - Clear all data

## UI/UX Analysis

### Layout Structure
```
???????????????????????????????????????????????????????????
?                 Application Header                       ?
???????????????????????????????????????????????????????????
?             ?                                           ?
?   Sidebar   ?            Main Content Area              ?
?             ?                                           ?
?   - Theme   ?   - Collection Header                     ?
?   - Actions ?   - Filters & Controls                    ?
?   - Library ?   - Collection View (Table/Cards/Compact) ?
?   - Import  ?                                           ?
?   - Profile ?                                           ?
?             ?                                           ?
???????????????????????????????????????????????????????????
```

### Color System
```css
/* Dark Theme (Default) */
--bg-primary: #1a1a1a        /* Main background */
--bg-secondary: #2d2d2d      /* Cards, modals */
--bg-tertiary: #404040       /* Hover states */
--text-primary: #e8e8e8      /* Main text */
--text-secondary: #b8b8b8    /* Secondary text */
--text-muted: #888888        /* Muted text */

/* Light Theme */
--bg-primary: #f5f5f5        /* Main background */
--bg-secondary: #ffffff      /* Cards, modals */
--bg-tertiary: #fafafa       /* Hover states */
--text-primary: #2c3e50      /* Main text */
--text-secondary: #7f8c8d    /* Secondary text */
--text-muted: #95a5a6        /* Muted text */

/* Status Colors */
--color-complete: #27ae60    /* Green for complete */
--color-priority: #f39c12    /* Orange for priority */
--color-incomplete: #e74c3c  /* Red for incomplete */
--color-info: #3498db        /* Blue for info */
```

### Component Hierarchy
```
App
??? ThemeProvider
??? LoadBearingCheck
??? ProfileSelector (when no profile selected)
?   ??? Profile circles
?   ??? AddProfileModal
?   ??? Edit/Delete actions
??? Main App (when profile selected)
    ??? Sidebar
    ?   ??? Profile info
    ?   ??? ThemeToggle
    ?   ??? Quick actions
    ?   ??? Import section
    ?   ??? Manga library
    ?   ??? Danger zone
    ??? CollectionView
        ??? Collection header
        ??? Filter controls
        ??? Sort controls
        ??? View mode toggle
        ??? Entry display (Table/Cards/Compact)
```

## State Management

### Application State
The app uses React's built-in state management with the following state structure:

```typescript
// App.jsx state
interface AppState {
    entries: Entry[];              // User's manga collection entries
    mangas: Manga[];              // Global manga library
    profiles: Profile[];          // Available user profiles
    selectedProfile: Profile;     // Currently active profile
    loading: boolean;             // Global loading state
    refreshing: boolean;          // Data refresh state
    error: string | null;         // Error messages
    appPhase: 'loading' | 'profile-selection' | 'main-app' | 'error';
    isChangingProfile: boolean;   // Profile switching state
    lastSelectedProfile: Profile; // Previously selected profile
}
```

### Context State
```typescript
// ThemeContext state
interface ThemeState {
    isDarkMode: boolean;
    toggleTheme: () => void;
}
```

### Local Component State
Each component manages its own local state for:
- Form data in modals
- Filter/sort preferences
- UI interaction states
- Temporary loading states

## Routing & Navigation

### Application Phases
The app uses phase-based navigation instead of traditional routing:

1. **Loading Phase**: Initial app startup
2. **Profile Selection Phase**: Choose/manage profiles
3. **Main App Phase**: Collection management interface
4. **Error Phase**: Error handling and recovery

### Navigation Flow
```
App Start ? Loading ? Profile Selection ? Main App
     ?                      ?               ?
     ??? Error Recovery ?????????? Profile Switch
```

### Key Navigation Actions
- Profile selection triggers phase change to main app
- "Change Profile" button returns to profile selection
- Back button available when switching profiles
- Error states provide retry mechanisms

## Styling & Theming

### CSS Architecture
- **CSS Variables**: Complete theme system using CSS custom properties
- **Component Styles**: Each component has its own CSS file
- **Global Styles**: Shared styles in App.css and index.css
- **Responsive Design**: Mobile-first approach with media queries

### Theme Implementation
- Theme controlled via `data-theme` attribute on document root
- CSS variables automatically switch based on theme
- Smooth transitions between theme changes
- User preference persisted in localStorage

### Key Visual Elements
- **Status Indicators**: Color-coded completion states
- **Progress Bars**: Visual representation of reading progress
- **Loading States**: Skeleton screens and spinners
- **Modal Overlays**: Form interfaces for data entry
- **Hover Effects**: Interactive feedback on buttons and cards

This completes the comprehensive technical analysis of the MangaCount React application.