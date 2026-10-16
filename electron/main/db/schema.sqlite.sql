-- schema.sqlite.sql
-- Esquema SQLite para MangaCount local (aplicacion desktop Electron).
-- Traducido del esquema PostgreSQL original de la version cliente-servidor:
--   SERIAL PRIMARY KEY        -> INTEGER PRIMARY KEY AUTOINCREMENT
--   ON CONFLICT (col) DO NOTHING -> INSERT OR IGNORE
--   \c / \echo (meta-comandos psql) eliminados.
-- Índices, seeds y constraint UNIQUE(ProfileId, MangaId) conservados.

CREATE TABLE IF NOT EXISTS Profile (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name VARCHAR(100) NOT NULL UNIQUE,
    ProfilePicture VARCHAR(500),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Format (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Publisher (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Manga (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Title VARCHAR(255) NOT NULL,
    TotalVolumes INTEGER NOT NULL DEFAULT 0,
    FormatId INTEGER REFERENCES Format(Id),
    PublisherId INTEGER REFERENCES Publisher(Id),
    ImageUrl VARCHAR(500),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Entry (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ProfileId INTEGER NOT NULL REFERENCES Profile(Id) ON DELETE CASCADE,
    MangaId INTEGER NOT NULL REFERENCES Manga(Id) ON DELETE CASCADE,
    PurchasedVolumes INTEGER NOT NULL DEFAULT 0,
    PendingVolumes VARCHAR(255),
    IsComplete BOOLEAN NOT NULL DEFAULT FALSE,
    IsPriority BOOLEAN NOT NULL DEFAULT FALSE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ProfileId, MangaId)
);

-- Vínculo de un manga con una entrada externa (p. ej. AniList). Aditivo:
-- no cambia el nombre local del manga ni Manga/Entry.
CREATE TABLE IF NOT EXISTS MangaExternalRef (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    MangaId INTEGER NOT NULL REFERENCES Manga(Id) ON DELETE CASCADE,
    Provider VARCHAR(32) NOT NULL,
    ExternalId VARCHAR(64) NOT NULL,
    CoverFile VARCHAR(255),
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(MangaId, Provider)
);

-- Sin seeds: una instalación nueva arranca en estado cero (sin perfiles, sin
-- editoriales ni formatos). El usuario crea el perfil y los catálogos que usa.

-- Índices para performance (mismos que PostgreSQL)
CREATE INDEX IF NOT EXISTS IX_Entry_ProfileId ON Entry(ProfileId);
CREATE INDEX IF NOT EXISTS IX_Entry_MangaId ON Entry(MangaId);
CREATE INDEX IF NOT EXISTS IX_Manga_Title ON Manga(Title);
CREATE INDEX IF NOT EXISTS IX_Entry_IsComplete ON Entry(IsComplete);
CREATE INDEX IF NOT EXISTS IX_Entry_IsPriority ON Entry(IsPriority);
CREATE INDEX IF NOT EXISTS IX_MangaExternalRef_MangaId ON MangaExternalRef(MangaId);
