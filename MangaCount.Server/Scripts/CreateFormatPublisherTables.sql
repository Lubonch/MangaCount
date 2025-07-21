-- Create Formats table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Formats' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[Formats] (
        [Id] int IDENTITY(1,1) NOT NULL,
        [Name] nvarchar(255) NOT NULL,
        CONSTRAINT [PK_Formats] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
    
    -- Insert default format
    INSERT INTO [dbo].[Formats] ([Name]) VALUES ('Unknown');
END

-- Create Publishers table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Publishers' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[Publishers] (
        [Id] int IDENTITY(1,1) NOT NULL,
        [Name] nvarchar(255) NOT NULL,
        CONSTRAINT [PK_Publishers] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
    
    -- Insert default publisher
    INSERT INTO [dbo].[Publishers] ([Name]) VALUES ('Unknown');
END

-- Add columns to Manga table if they don't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Manga' AND COLUMN_NAME = 'FormatId')
BEGIN
    ALTER TABLE [dbo].[Manga] ADD [FormatId] int NOT NULL DEFAULT 1;
    ALTER TABLE [dbo].[Manga] ADD CONSTRAINT [FK_Manga_Formats] FOREIGN KEY ([FormatId]) REFERENCES [dbo].[Formats]([Id]);
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Manga' AND COLUMN_NAME = 'PublisherId')
BEGIN
    ALTER TABLE [dbo].[Manga] ADD [PublisherId] int NOT NULL DEFAULT 1;
    ALTER TABLE [dbo].[Manga] ADD CONSTRAINT [FK_Manga_Publishers] FOREIGN KEY ([PublisherId]) REFERENCES [dbo].[Publishers]([Id]);
END