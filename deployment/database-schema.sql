-- database-schema.sql
-- Schema PostgreSQL para MangaCount en servidor Linux

\c MangaCount;

-- Crear tabla Profile
CREATE TABLE IF NOT EXISTS Profile (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL UNIQUE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla Format  
CREATE TABLE IF NOT EXISTS Format (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(50) NOT NULL UNIQUE
);

-- Crear tabla Publisher
CREATE TABLE IF NOT EXISTS Publisher (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL UNIQUE
);

-- Crear tabla Manga
CREATE TABLE IF NOT EXISTS Manga (
    Id SERIAL PRIMARY KEY,
    Title VARCHAR(255) NOT NULL,
    TotalVolumes INTEGER NOT NULL DEFAULT 0,
    FormatId INTEGER REFERENCES Format(Id),
    PublisherId INTEGER REFERENCES Publisher(Id),
    ImageUrl VARCHAR(500),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla Entry (relación Profile-Manga)  
CREATE TABLE IF NOT EXISTS Entry (
    Id SERIAL PRIMARY KEY,
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

-- Insertar datos iniciales
INSERT INTO Format (Name) VALUES 
('Tankoubon'), ('Kanzenban'), ('Bunkoban'), ('Aizouban'), ('Digital')
ON CONFLICT (Name) DO NOTHING;

INSERT INTO Publisher (Name) VALUES 
('Panini'), ('Ivrea'), ('Ovni Press'), ('ECC Ediciones'), ('Norma Editorial')  
ON CONFLICT (Name) DO NOTHING;

-- Crear perfil por defecto
INSERT INTO Profile (Name) VALUES ('Default Profile')
ON CONFLICT (Name) DO NOTHING;

-- Índices para performance
CREATE INDEX IF NOT EXISTS IX_Entry_ProfileId ON Entry(ProfileId);
CREATE INDEX IF NOT EXISTS IX_Entry_MangaId ON Entry(MangaId); 
CREATE INDEX IF NOT EXISTS IX_Manga_Title ON Manga(Title);
CREATE INDEX IF NOT EXISTS IX_Entry_IsComplete ON Entry(IsComplete);  
CREATE INDEX IF NOT EXISTS IX_Entry_IsPriority ON Entry(IsPriority);

\echo 'PostgreSQL schema creado exitosamente para MangaCount';