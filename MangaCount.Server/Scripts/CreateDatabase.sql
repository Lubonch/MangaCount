-- MangaCount Database Creation Script
-- Execute this script to create the database and tables

-- Create database (run this separately if needed)
-- CREATE DATABASE MangaCount;
-- GO
-- USE MangaCount;
-- GO

-- Create Profiles table
CREATE TABLE [dbo].[Profiles] (
    [Id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Name] nvarchar(255) NOT NULL,
    [ProfilePicture] nvarchar(500) NULL,
    [CreatedDate] datetime2 NOT NULL DEFAULT GETUTCDATE(),
    [IsActive] bit NOT NULL DEFAULT 1
);

-- Create Formats table
CREATE TABLE [dbo].[Formats] (
    [Id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Name] nvarchar(255) NOT NULL
);

-- Create Publishers table
CREATE TABLE [dbo].[Publishers] (
    [Id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Name] nvarchar(255) NOT NULL
);

-- Create Manga table
CREATE TABLE [dbo].[Manga] (
    [Id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Name] nvarchar(255) NOT NULL,
    [Volumes] int NULL,
    [FormatId] int NOT NULL DEFAULT 1,
    [PublisherId] int NOT NULL DEFAULT 1,
    CONSTRAINT [FK_Manga_Formats] FOREIGN KEY ([FormatId]) 
        REFERENCES [dbo].[Formats]([Id]),
    CONSTRAINT [FK_Manga_Publishers] FOREIGN KEY ([PublisherId]) 
        REFERENCES [dbo].[Publishers]([Id])
);

-- Create Entry table
CREATE TABLE [dbo].[Entry] (
    [Id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MangaId] int NOT NULL,
    [ProfileId] int NOT NULL,
    [Quantity] int NOT NULL DEFAULT 0,
    [Pending] nvarchar(500) NULL,
    [Priority] bit NOT NULL DEFAULT 0,
    CONSTRAINT [FK_Entry_Manga] FOREIGN KEY ([MangaId]) 
        REFERENCES [dbo].[Manga]([Id]),
    CONSTRAINT [FK_Entry_Profile] FOREIGN KEY ([ProfileId]) 
        REFERENCES [dbo].[Profiles]([Id])
);

-- Insert default data
INSERT INTO [dbo].[Formats] ([Name]) VALUES ('Unknown');
INSERT INTO [dbo].[Publishers] ([Name]) VALUES ('Unknown');

-- Insert some sample formats
INSERT INTO [dbo].[Formats] ([Name]) VALUES ('Kanzenban');
INSERT INTO [dbo].[Formats] ([Name]) VALUES ('Tank?bon');
INSERT INTO [dbo].[Formats] ([Name]) VALUES ('Bunkoban');
INSERT INTO [dbo].[Formats] ([Name]) VALUES ('Wide-ban');

-- Insert some sample publishers
INSERT INTO [dbo].[Publishers] ([Name]) VALUES ('Shogakukan');
INSERT INTO [dbo].[Publishers] ([Name]) VALUES ('Kodansha');
INSERT INTO [dbo].[Publishers] ([Name]) VALUES ('Shueisha');
INSERT INTO [dbo].[Publishers] ([Name]) VALUES ('Square Enix');
INSERT INTO [dbo].[Publishers] ([Name]) VALUES ('Hakusensha');

PRINT 'Database schema created successfully!';
PRINT 'Default formats and publishers have been inserted.';
PRINT 'You can now run the MangaCount application.';