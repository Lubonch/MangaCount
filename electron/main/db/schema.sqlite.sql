-- SQLite schema for MangaCount local (Electron desktop app).
-- Translated from the original PostgreSQL schema of the client-server version:
--   SERIAL PRIMARY KEY        -> INTEGER PRIMARY KEY AUTOINCREMENT
--   ON CONFLICT (col) DO NOTHING -> INSERT OR IGNORE
--   \c / \echo (psql meta-commands) removed.
-- Indexes, seeds and the UNIQUE(ProfileId, MangaId) constraint are preserved.

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
    IsAdult INTEGER NOT NULL DEFAULT 0,
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

-- Link of a manga to an external entry (e.g. AniList). Additive: it does not
-- change the local manga name nor Manga/Entry.
CREATE TABLE IF NOT EXISTS MangaExternalRef (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    MangaId INTEGER NOT NULL REFERENCES Manga(Id) ON DELETE CASCADE,
    Provider VARCHAR(32) NOT NULL,
    ExternalId VARCHAR(64) NOT NULL,
    CoverFile VARCHAR(255),
    IsAdult INTEGER NOT NULL DEFAULT 0,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(MangaId, Provider)
);

-- Recommender feedback (additive migration). `RecommendationDismissal` is the
-- "not viable" (permanent dismissal per profile); `RecommendationSeen` is "already
-- seen" with expiry (TTL). "Already have it" reuses `MangaExternalRef`.
CREATE TABLE IF NOT EXISTS RecommendationDismissal (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ProfileId INTEGER NOT NULL REFERENCES Profile(Id) ON DELETE CASCADE,
    Provider VARCHAR(32) NOT NULL,
    ExternalId VARCHAR(64) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ProfileId, Provider, ExternalId)
);

CREATE TABLE IF NOT EXISTS RecommendationSeen (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ProfileId INTEGER NOT NULL REFERENCES Profile(Id) ON DELETE CASCADE,
    Provider VARCHAR(32) NOT NULL,
    ExternalId VARCHAR(64) NOT NULL,
    SeenAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ProfileId, Provider, ExternalId)
);

-- No seeds: a fresh install starts from zero (no profiles, no publishers, no
-- formats). The user creates the profile and the catalogs they use.

-- Indexes for performance (same as PostgreSQL)
CREATE INDEX IF NOT EXISTS IX_Entry_ProfileId ON Entry(ProfileId);
CREATE INDEX IF NOT EXISTS IX_Entry_MangaId ON Entry(MangaId);
CREATE INDEX IF NOT EXISTS IX_Manga_Title ON Manga(Title);
CREATE INDEX IF NOT EXISTS IX_Entry_IsComplete ON Entry(IsComplete);
CREATE INDEX IF NOT EXISTS IX_Entry_IsPriority ON Entry(IsPriority);
CREATE INDEX IF NOT EXISTS IX_MangaExternalRef_MangaId ON MangaExternalRef(MangaId);
CREATE INDEX IF NOT EXISTS IX_RecommendationDismissal_ProfileId ON RecommendationDismissal(ProfileId);
CREATE INDEX IF NOT EXISTS IX_RecommendationSeen_ProfileId ON RecommendationSeen(ProfileId);
