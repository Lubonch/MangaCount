-- Create Formats table
CREATE TABLE [dbo].[Formats] (
    [Id] int IDENTITY(1,1) NOT NULL,
    [Name] nvarchar(255) NOT NULL,
    CONSTRAINT [PK_Formats] PRIMARY KEY CLUSTERED ([Id] ASC)
);

-- Create Publishers table
CREATE TABLE [dbo].[Publishers] (
    [Id] int IDENTITY(1,1) NOT NULL,
    [Name] nvarchar(255) NOT NULL,
    CONSTRAINT [PK_Publishers] PRIMARY KEY CLUSTERED ([Id] ASC)
);

-- Insert default values first
INSERT INTO [dbo].[Formats] ([Name]) VALUES ('Unknown');
INSERT INTO [dbo].[Publishers] ([Name]) VALUES ('Unknown');

-- Add columns to existing Manga table with default values
ALTER TABLE [dbo].[Manga] 
ADD [FormatId] int NOT NULL DEFAULT 1,
    [PublisherId] int NOT NULL DEFAULT 1;

-- Add foreign key constraints
ALTER TABLE [dbo].[Manga] 
ADD CONSTRAINT [FK_Manga_Formats] FOREIGN KEY ([FormatId]) REFERENCES [dbo].[Formats]([Id]);

ALTER TABLE [dbo].[Manga] 
ADD CONSTRAINT [FK_Manga_Publishers] FOREIGN KEY ([PublisherId]) REFERENCES [dbo].[Publishers]([Id]);