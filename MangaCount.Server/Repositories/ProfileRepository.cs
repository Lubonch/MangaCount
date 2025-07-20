using Dapper;
using MangaCount.Server.Domain;
using MangaCount.Server.Repositories.Contracts;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using System.Data;

namespace MangaCount.Server.Repositories
{
    public class ProfileRepository : IProfileRepository
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<ProfileRepository> _logger;

        public ProfileRepository(IConfiguration configuration, ILogger<ProfileRepository> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public Profile Create(Profile profile)
        {
            try
            {
                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var sql = @"
                    INSERT INTO [dbo].[Profile]([Name], [ProfilePicture], [CreatedDate], [IsActive])
                    VALUES (@Name, @ProfilePicture, @CreatedDate, @IsActive);
                    SELECT CAST(SCOPE_IDENTITY() as int);";

                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    var newId = connection.QuerySingle<int>(sql, new
                    {
                        Name = profile.Name,
                        ProfilePicture = profile.ProfilePicture,
                        CreatedDate = profile.CreatedDate,
                        IsActive = profile.IsActive
                    });

                    return GetById(newId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating profile with name {Name}", profile.Name);
                throw new Exception($"Error creating profile: {ex.Message}", ex);
            }
        }

        public Profile Update(Profile profile)
        {
            try
            {
                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var sql = @"
                    UPDATE [dbo].[Profile] 
                    SET [Name] = @Name, [ProfilePicture] = @ProfilePicture, [IsActive] = @IsActive 
                    WHERE [Id] = @Id";

                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    connection.Execute(sql, new
                    {
                        Id = profile.Id,
                        Name = profile.Name,
                        ProfilePicture = profile.ProfilePicture,
                        IsActive = profile.IsActive
                    });

                    return GetById(profile.Id);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating profile with ID {Id}", profile.Id);
                throw new Exception($"Error updating profile: {ex.Message}", ex);
            }
        }

        public Profile GetById(int id)
        {
            try
            {
                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var sql = "SELECT * FROM [dbo].[Profile] WHERE [Id] = @Id";

                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    var profileResult = connection.QueryFirstOrDefault<Profile>(sql, new { Id = id });
                    return profileResult;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting profile with ID {Id}", id);
                throw new Exception($"Error getting profile: {ex.Message}", ex);
            }
        }

        public IEnumerable<Profile> GetAllProfiles()
        {
            try
            {
                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var sql = "SELECT * FROM [dbo].[Profile] WHERE [IsActive] = 1 ORDER BY [Name]";

                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    var profileResult = connection.Query<Profile>(sql).ToList();
                    return profileResult;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all profiles");
                throw new Exception($"Error getting all profiles: {ex.Message}", ex);
            }
        }

        public void Delete(int id)
        {
            try
            {
                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                // Soft delete - just mark as inactive
                var sql = "UPDATE [dbo].[Profile] SET [IsActive] = 0 WHERE [Id] = @Id";

                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    connection.Execute(sql, new { Id = id });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting profile with ID {Id}", id);
                throw new Exception($"Error deleting profile: {ex.Message}", ex);
            }
        }
    }
}