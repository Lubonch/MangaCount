using MangaCount.Server.Services.Contracts;
using Microsoft.Data.SqlClient;
using Dapper;

namespace MangaCount.Server.Services
{
    public class DatabaseService : IDatabaseService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<DatabaseService> _logger;

        public DatabaseService(IConfiguration configuration, ILogger<DatabaseService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<DatabaseStatistics> GetDatabaseStatisticsAsync()
        {
            try
            {
                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                using var connection = new SqlConnection(connString);
                await connection.OpenAsync();

                var stats = new DatabaseStatistics
                {
                    TotalEntries = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM [dbo].[Entry]"),
                    TotalManga = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM [dbo].[Manga]"),
                    TotalProfiles = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM [dbo].[Profile] WHERE [IsActive] = 1"),
                    TotalFormats = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM [dbo].[Formats]"),
                    TotalPublishers = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM [dbo].[Publishers]")
                };

                return stats;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting database statistics");
                throw;
            }
        }

        public async Task<bool> NukeAllDataAsync()
        {
            // Keep the original nuclear option as-is for backward compatibility
            var options = new SelectiveDeletionOptions
            {
                DeleteEntries = true,
                DeleteManga = true,
                DeleteProfiles = true,
                DeleteFormats = true,
                DeletePublishers = true,
                ResetIdentities = true,
                KeepDefaultFormatsAndPublishers = true
            };

            return await SelectiveDeleteAsync(options);
        }

        public async Task<DeletionPreview> GetDeletionPreviewAsync(SelectiveDeletionOptions options)
        {
            try
            {
                string connString = _configuration.GetConnectionString("MangacountDatabase")!;
                using var connection = new SqlConnection(connString);
                await connection.OpenAsync();

                var preview = new DeletionPreview { IsValid = true };

                // Get current counts
                var totalEntries = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM [dbo].[Entry]");
                var totalManga = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM [dbo].[Manga]");
                var totalProfiles = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM [dbo].[Profile] WHERE [IsActive] = 1");
                var totalFormats = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM [dbo].[Formats]");
                var totalPublishers = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM [dbo].[Publishers]");

                // Check dependencies and validate options
                if (options.DeleteManga && !options.DeleteEntries && totalEntries > 0)
                {
                    preview.IsValid = false;
                    preview.Warnings.Add("Cannot delete Manga without deleting Entries first (foreign key constraint)");
                }

                if (options.DeleteProfiles && !options.DeleteEntries && totalEntries > 0)
                {
                    preview.IsValid = false;
                    preview.Warnings.Add("Cannot delete Profiles without deleting Entries first (foreign key constraint)");
                }

                if (options.DeleteFormats && !options.DeleteManga && totalManga > 0)
                {
                    preview.IsValid = false;
                    preview.Warnings.Add("Cannot delete Formats without deleting Manga first (foreign key constraint)");
                }

                if (options.DeletePublishers && !options.DeleteManga && totalManga > 0)
                {
                    preview.IsValid = false;
                    preview.Warnings.Add("Cannot delete Publishers without deleting Manga first (foreign key constraint)");
                }

                // Calculate what will be deleted
                if (options.DeleteEntries)
                {
                    preview.EstimatedEntriesDeleted = totalEntries;
                    preview.Actions.Add($"Delete {totalEntries} entries");
                }

                if (options.DeleteManga)
                {
                    preview.EstimatedMangaDeleted = totalManga;
                    preview.Actions.Add($"Delete {totalManga} manga");
                }

                if (options.DeleteProfiles)
                {
                    preview.EstimatedProfilesDeleted = totalProfiles;
                    preview.Actions.Add($"Deactivate {totalProfiles} profiles");
                }

                if (options.DeleteFormats)
                {
                    var formatsToDelete = options.KeepDefaultFormatsAndPublishers ? 
                        await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM [dbo].[Formats] WHERE [Id] > 1") : 
                        totalFormats;
                    preview.EstimatedFormatsDeleted = formatsToDelete;
                    preview.Actions.Add($"Delete {formatsToDelete} formats" + 
                        (options.KeepDefaultFormatsAndPublishers ? " (keeping default)" : ""));
                }

                if (options.DeletePublishers)
                {
                    var publishersToDelete = options.KeepDefaultFormatsAndPublishers ? 
                        await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM [dbo].[Publishers] WHERE [Id] > 1") : 
                        totalPublishers;
                    preview.EstimatedPublishersDeleted = publishersToDelete;
                    preview.Actions.Add($"Delete {publishersToDelete} publishers" + 
                        (options.KeepDefaultFormatsAndPublishers ? " (keeping default)" : ""));
                }

                if (options.ResetIdentities)
                {
                    preview.Actions.Add("Reset identity columns");
                }

                return preview;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting deletion preview");
                return new DeletionPreview 
                { 
                    IsValid = false, 
                    Warnings = new List<string> { $"Error generating preview: {ex.Message}" } 
                };
            }
        }

        public async Task<bool> SelectiveDeleteAsync(SelectiveDeletionOptions options)
        {
            try
            {
                // First validate the deletion plan
                var preview = await GetDeletionPreviewAsync(options);
                if (!preview.IsValid)
                {
                    _logger.LogError("Invalid deletion options: {Warnings}", string.Join(", ", preview.Warnings));
                    return false;
                }

                string connString = _configuration.GetConnectionString("MangacountDatabase")!;
                using var connection = new SqlConnection(connString);
                await connection.OpenAsync();

                using var transaction = await connection.BeginTransactionAsync();

                try
                {
                    // Delete in correct order to respect foreign key constraints
                    if (options.DeleteEntries)
                    {
                        await connection.ExecuteAsync("DELETE FROM [dbo].[Entry]", transaction: transaction);
                        _logger.LogInformation("Deleted all entries");
                    }

                    if (options.DeleteManga)
                    {
                        await connection.ExecuteAsync("DELETE FROM [dbo].[Manga]", transaction: transaction);
                        _logger.LogInformation("Deleted all manga");
                    }

                    if (options.DeleteProfiles)
                    {
                        await connection.ExecuteAsync("UPDATE [dbo].[Profile] SET [IsActive] = 0", transaction: transaction);
                        _logger.LogInformation("Deactivated all profiles");
                    }

                    if (options.DeleteFormats)
                    {
                        if (options.KeepDefaultFormatsAndPublishers)
                        {
                            await connection.ExecuteAsync("DELETE FROM [dbo].[Formats] WHERE [Id] > 1", transaction: transaction);
                            _logger.LogInformation("Deleted custom formats (kept default)");
                        }
                        else
                        {
                            await connection.ExecuteAsync("DELETE FROM [dbo].[Formats]", transaction: transaction);
                            _logger.LogInformation("Deleted all formats");
                        }
                    }

                    if (options.DeletePublishers)
                    {
                        if (options.KeepDefaultFormatsAndPublishers)
                        {
                            await connection.ExecuteAsync("DELETE FROM [dbo].[Publishers] WHERE [Id] > 1", transaction: transaction);
                            _logger.LogInformation("Deleted custom publishers (kept default)");
                        }
                        else
                        {
                            await connection.ExecuteAsync("DELETE FROM [dbo].[Publishers]", transaction: transaction);
                            _logger.LogInformation("Deleted all publishers");
                        }
                    }

                    // Reset identity columns if requested
                    if (options.ResetIdentities)
                    {
                        if (options.DeleteEntries)
                            await connection.ExecuteAsync("DBCC CHECKIDENT('[dbo].[Entry]', RESEED, 0)", transaction: transaction);
                        
                        if (options.DeleteManga)
                            await connection.ExecuteAsync("DBCC CHECKIDENT('[dbo].[Manga]', RESEED, 0)", transaction: transaction);
                        
                        if (options.DeleteProfiles)
                            await connection.ExecuteAsync("DBCC CHECKIDENT('[dbo].[Profile]', RESEED, 0)", transaction: transaction);
                        
                        if (options.DeleteFormats)
                        {
                            var reseedValue = options.KeepDefaultFormatsAndPublishers ? 1 : 0;
                            await connection.ExecuteAsync($"DBCC CHECKIDENT('[dbo].[Formats]', RESEED, {reseedValue})", transaction: transaction);
                        }
                        
                        if (options.DeletePublishers)
                        {
                            var reseedValue = options.KeepDefaultFormatsAndPublishers ? 1 : 0;
                            await connection.ExecuteAsync($"DBCC CHECKIDENT('[dbo].[Publishers]', RESEED, {reseedValue})", transaction: transaction);
                        }
                        
                        _logger.LogInformation("Reset identity columns");
                    }

                    await transaction.CommitAsync();
                    
                    _logger.LogWarning("Selective database deletion completed: {Actions}", string.Join(", ", preview.Actions));
                    return true;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during selective database deletion");
                return false;
            }
        }
    }
}