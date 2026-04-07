using Dapper;
using MangaCount.Server.Domain;
using MangaCount.Server.Repositories.Contracts;
using Npgsql;
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
                    INSERT INTO profile (name, createdat)
                    VALUES (@Name, @CreatedDate)
                    RETURNING id;";

                using (var connection = new NpgsqlConnection(connString))
                {
                    connection.Open();
                    var newId = connection.QuerySingle<int>(sql, new
                    {
                        Name = profile.Name,
                        CreatedDate = profile.CreatedDate
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

                using (var connection = new NpgsqlConnection(connString))
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

                var sql = "SELECT id, name, createdat AS CreatedDate FROM profile WHERE id = @Id";

                using (var connection = new NpgsqlConnection(connString))
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

                var sql = "SELECT id, name, createdat AS CreatedDate FROM profile ORDER BY name";

                using (var connection = new NpgsqlConnection(connString))
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

                // Hard delete since we don't have IsActive column
                var sql = "DELETE FROM profile WHERE id = @Id";

                using (var connection = new NpgsqlConnection(connString))
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