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

-- Datos iniciales (mismo seed que PostgreSQL)
INSERT OR IGNORE INTO Format (Name) VALUES
('Tankoubon'), ('Kanzenban'), ('Bunkoban'), ('Aizouban'), ('Digital');

INSERT OR IGNORE INTO Publisher (Name) VALUES
('Panini'), ('Ivrea'), ('Ovni Press'), ('ECC Ediciones'), ('Norma Editorial');

INSERT OR IGNORE INTO Profile (Name) VALUES ('Default Profile');

-- Índices para performance (mismos que PostgreSQL)
CREATE INDEX IF NOT EXISTS IX_Entry_ProfileId ON Entry(ProfileId);
CREATE INDEX IF NOT EXISTS IX_Entry_MangaId ON Entry(MangaId);
CREATE INDEX IF NOT EXISTS IX_Manga_Title ON Manga(Title);
CREATE INDEX IF NOT EXISTS IX_Entry_IsComplete ON Entry(IsComplete);
CREATE INDEX IF NOT EXISTS IX_Entry_IsPriority ON Entry(IsPriority);
