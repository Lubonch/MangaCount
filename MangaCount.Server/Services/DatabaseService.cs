using MangaCount.Server.Services.Contracts;
using Npgsql;
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

                using var connection = new NpgsqlConnection(connString);
                await connection.OpenAsync();

                var stats = new DatabaseStatistics
                {
                    TotalEntries = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM entry"),
                    TotalManga = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM manga"),
                    TotalProfiles = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM profile"),
                    TotalFormats = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM format"),
                    TotalPublishers = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM publisher")
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
                using var connection = new NpgsqlConnection(connString);
                await connection.OpenAsync();

                var preview = new DeletionPreview { IsValid = true };

                // Get current counts
                var totalEntries = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM entry");
                var totalManga = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM manga");
                var totalProfiles = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM profile");
                var totalFormats = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM format");
                var totalPublishers = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM publisher");

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
                        await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM format WHERE id > 1") : 
                        totalFormats;
                    preview.EstimatedFormatsDeleted = formatsToDelete;
                    preview.Actions.Add($"Delete {formatsToDelete} formats" + 
                        (options.KeepDefaultFormatsAndPublishers ? " (keeping default)" : ""));
                }

                if (options.DeletePublishers)
                {
                    var publishersToDelete = options.KeepDefaultFormatsAndPublishers ? 
                        await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM publisher WHERE id > 1") : 
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
                using var connection = new NpgsqlConnection(connString);
                await connection.OpenAsync();

                using var transaction = await connection.BeginTransactionAsync();

                try
                {
                    // Delete in correct order to respect foreign key constraints
                    if (options.DeleteEntries)
                    {
                        await connection.ExecuteAsync("DELETE FROM entry", transaction: transaction);
                        _logger.LogInformation("Deleted all entries");
                    }

                    if (options.DeleteManga)
                    {
                        await connection.ExecuteAsync("DELETE FROM manga", transaction: transaction);
                        _logger.LogInformation("Deleted all manga");
                    }

                    if (options.DeleteProfiles)
                    {
                        await connection.ExecuteAsync("DELETE FROM profile", transaction: transaction);
                        _logger.LogInformation("Deleted all profiles");
                    }

                    if (options.DeleteFormats)
                    {
                        if (options.KeepDefaultFormatsAndPublishers)
                        {
                            await connection.ExecuteAsync("DELETE FROM format WHERE id > 1", transaction: transaction);
                            _logger.LogInformation("Deleted custom formats (kept default)");
                        }
                        else
                        {
                            await connection.ExecuteAsync("DELETE FROM format", transaction: transaction);
                            _logger.LogInformation("Deleted all formats");
                        }
                    }

                    if (options.DeletePublishers)
                    {
                        if (options.KeepDefaultFormatsAndPublishers)
                        {
                            await connection.ExecuteAsync("DELETE FROM publisher WHERE id > 1", transaction: transaction);
                            _logger.LogInformation("Deleted custom publishers (kept default)");
                        }
                        else
                        {
                            await connection.ExecuteAsync("DELETE FROM publisher", transaction: transaction);
                            _logger.LogInformation("Deleted all publishers");
                        }
                    }

                    // Reset identity columns if requested
                    if (options.ResetIdentities)
                    {
                        if (options.DeleteEntries)
                            await connection.ExecuteAsync("ALTER SEQUENCE entry_id_seq RESTART WITH 1", transaction: transaction);
                        
                        if (options.DeleteManga)
                            await connection.ExecuteAsync("ALTER SEQUENCE manga_id_seq RESTART WITH 1", transaction: transaction);
                        
                        if (options.DeleteProfiles)
                            await connection.ExecuteAsync("ALTER SEQUENCE profile_id_seq RESTART WITH 1", transaction: transaction);
                        
                        if (options.DeleteFormats)
                        {
                            var reseedValue = options.KeepDefaultFormatsAndPublishers ? 2 : 1;
                            await connection.ExecuteAsync($"ALTER SEQUENCE format_id_seq RESTART WITH {reseedValue}", transaction: transaction);
                        }
                        
                        if (options.DeletePublishers)
                        {
                            var reseedValue = options.KeepDefaultFormatsAndPublishers ? 2 : 1;
                            await connection.ExecuteAsync($"ALTER SEQUENCE publisher_id_seq RESTART WITH {reseedValue}", transaction: transaction);
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