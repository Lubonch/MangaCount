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
            try
            {
                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                using var connection = new SqlConnection(connString);
                await connection.OpenAsync();

                using var transaction = await connection.BeginTransactionAsync();

                try
                {
                    // Delete in correct order to avoid foreign key constraints
                    await connection.ExecuteAsync("DELETE FROM [dbo].[Entry]", transaction: transaction);
                    await connection.ExecuteAsync("DELETE FROM [dbo].[Manga]", transaction: transaction);
                    await connection.ExecuteAsync("UPDATE [dbo].[Profile] SET [IsActive] = 0", transaction: transaction);
                    
                    // Keep some default formats and publishers
                    await connection.ExecuteAsync("DELETE FROM [dbo].[Formats] WHERE [Id] > 1", transaction: transaction);
                    await connection.ExecuteAsync("DELETE FROM [dbo].[Publishers] WHERE [Id] > 1", transaction: transaction);

                    // Reset identity columns
                    await connection.ExecuteAsync("DBCC CHECKIDENT('[dbo].[Entry]', RESEED, 0)", transaction: transaction);
                    await connection.ExecuteAsync("DBCC CHECKIDENT('[dbo].[Manga]', RESEED, 0)", transaction: transaction);
                    await connection.ExecuteAsync("DBCC CHECKIDENT('[dbo].[Profile]', RESEED, 0)", transaction: transaction);
                    await connection.ExecuteAsync("DBCC CHECKIDENT('[dbo].[Formats]', RESEED, 1)", transaction: transaction);
                    await connection.ExecuteAsync("DBCC CHECKIDENT('[dbo].[Publishers]', RESEED, 1)", transaction: transaction);

                    await transaction.CommitAsync();
                    
                    _logger.LogWarning("Database nuked - all data cleared");
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
                _logger.LogError(ex, "Error nuking database");
                return false;
            }
        }
    }
}