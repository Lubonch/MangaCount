# Manga Collection Management System - Implementation Plan

## Overview
Build a .NET 10 + Angular local web application with hexagonal architecture to manage multiple personas' manga collections. SQLite database with TSV import, image fetching from free APIs, clean interface, and WhatsApp bot integration in Phase 2.

## Technology Stack
- **Backend**: .NET 10, ASP.NET Core Web API
- **Frontend**: Angular 18+, Material Design
- **Database**: SQLite with Entity Framework Core
- **Architecture**: Hexagonal/Clean Architecture
- **Image Source**: Jikan API (MyAnimeList data) - free, no API key
- **WhatsApp Bot**: Node.js with whatsapp-web.js (Phase 2)

## Project Structure
```
MangaCount/
├── src/
│   ├── MangaCount.Domain/              # Core entities and business logic
│   ├── MangaCount.Application/         # Use cases, services, interfaces
│   ├── MangaCount.Infrastructure/      # Data access, external services
│   ├── MangaCount.API/                 # Web API controllers
│   └── MangaCount.WhatsAppBot/         # Node.js bot (Phase 2)
├── frontend/                           # Angular SPA
├── tests/                              # Unit and integration tests
├── docs/                               # Documentation
├── MangaCount.sln                      # Solution file
└── Inventario - Lucas.tsv              # Source data
```

## Implementation Phases

### Phase 1: Core Application (MVP)

#### Step 1: Project Structure Setup ✅
- [x] Create solution with hexagonal architecture projects
- [x] Configure Entity Framework Core with SQLite
- [x] Set up AutoMapper, MediatR for CQRS pattern
- [x] Created API, Domain, Application, Infrastructure projects
- [x] Added all necessary NuGet packages

#### Step 2: Domain Model & Database ✅
- [x] Create Manga entity with TSV columns mapping
- [x] Create Profile entity for person management
- [x] Configure EF migrations and seed data
- [x] Set up MangaDbContext with proper relationships

#### Step 3: TSV Import Feature ✅
- [x] Build TSV parser using CsvHelper
- [x] Create import service with validation
- [x] Map existing Lucas data to profile structure
- [x] Added export functionality

#### Step 4: Core CRUD API ✅
- [x] Build REST APIs for manga operations
- [x] Implement profile switching endpoints
- [x] Add search and filtering capabilities
- [x] Create ProfilesController and MangaController
- [x] Add import/export endpoints

#### Step 5: Angular Frontend Foundation
- [x] Set up Angular with Angular 21 CLI
- [ ] Create manga list and forms
- [ ] Implement profile selector

#### Step 6: Image Integration
- [ ] Integrate Jikan API for manga covers
- [ ] Implement caching system
- [ ] Add fallback placeholders

### Phase 2: Enhanced Features

#### Step 7: WhatsApp Bot Integration
- [ ] Set up Node.js whatsapp-web.js service
- [ ] Create command parser
- [ ] Integrate with .NET API

#### Step 8: Advanced Features
- [ ] Export functionality (TSV, PDF)
- [ ] Bulk edit operations
- [ ] Statistics dashboard

## Key Features

### Core Entities
1. **Manga**
   - Title, Purchased, Total, Pending, Complete, Priority, Format, Publisher
   - Image URL (fetched from API)
   - Profile association

2. **Profile**
   - Name, Created date, Active status
   - One-to-many with Manga

### API Endpoints
```
GET    /api/profiles                    # List all profiles
POST   /api/profiles                    # Create profile
GET    /api/profiles/{id}/manga         # Get manga for profile
POST   /api/profiles/{id}/manga         # Add manga to profile
PUT    /api/manga/{id}                  # Update manga
DELETE /api/manga/{id}                  # Delete manga
POST   /api/profiles/{id}/import-tsv    # Import TSV for profile
GET    /api/manga/search               # Search manga
```

### Frontend Components
- Profile selector (dropdown)
- Manga list (grid/table with images)
- Add/Edit manga form
- Search and filters
- Import TSV dialog
- Statistics dashboard

## Data Model

### TSV Mapping
```
Title → Title (string)
Comprados → Purchased (int)
Total → Total (string, handles "??" values)
Pendiente(No consecutivos) → Pending (string)
Completa → Complete (bool)
Prioridad → Priority (bool)
Formato → Format (string)
Editorial → Publisher (string)
```

## Verification Criteria

### Phase 1 Acceptance
1. ✅ Import Lucas TSV creates 47+ manga entries
2. ✅ Switch between profiles shows separate collections
3. ✅ CRUD operations work for all manga fields
4. ✅ Images display from Jikan API with fallbacks
5. ✅ Export collection back to TSV format
6. ✅ Clean, emoji-free responsive interface

### Phase 2 Acceptance
7. ✅ WhatsApp commands: add, search, list manga
8. ✅ Real-time sync between WhatsApp and web interface

## Development Notes

### Free APIs for Images
- **Jikan API**: https://jikan.moe/ (MyAnimeList data, no auth)
- **Mangadex API**: https://api.mangadex.org/ (fallback option)

### WhatsApp Bot Commands (Phase 2)
```
/manga add "Title" chapters:10 format:B6
/manga search "title"
/manga list incomplete
/manga stats
```

### Database Schema
```sql
CREATE TABLE Profiles (
    Id INTEGER PRIMARY KEY,
    Name TEXT NOT NULL,
    CreatedDate TEXT,
    IsActive BOOLEAN
);

CREATE TABLE Manga (
    Id INTEGER PRIMARY KEY,
    ProfileId INTEGER,
    Title TEXT NOT NULL,
    Purchased INTEGER,
    Total TEXT,
    Pending TEXT,
    Complete BOOLEAN,
    Priority BOOLEAN,
    Format TEXT,
    Publisher TEXT,
    ImageUrl TEXT,
    FOREIGN KEY (ProfileId) REFERENCES Profiles (Id)
);
```

## Next Steps
1. Set up .NET solution structure
2. Create domain entities
3. Configure Entity Framework
4. Build basic API controllers
5. Set up Angular frontend
6. Implement TSV import functionality