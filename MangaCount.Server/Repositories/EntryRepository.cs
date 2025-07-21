using Dapper;
using MangaCount.Server.Domain;
using MangaCount.Server.Repositories.Contracts;
using Microsoft.Data.SqlClient;
using System;
using System.Data;

namespace MangaCount.Server.Repositories
{
    public class EntryRepository : IEntryRepository
    {
        private readonly IConfiguration _configuration;

        public EntryRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public IEnumerable<Entry> GetAllEntries(int? profileId = null)
        {
            try
            {
                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var sql = @"
                    SELECT 
                        e.Id, e.MangaId, e.ProfileId, e.Quantity, e.Pending, e.Priority,
                        m.Id, m.Name, m.Volumes, m.FormatId, m.PublisherId,
                        f.Id, f.Name,
                        p.Id, p.Name
                    FROM [dbo].[Entry] e
                    LEFT JOIN [dbo].[Manga] m ON e.MangaId = m.Id
                    LEFT JOIN [dbo].[Formats] f ON m.FormatId = f.Id
                    LEFT JOIN [dbo].[Publishers] p ON m.PublisherId = p.Id";
                
                var parameters = new DynamicParameters();
                
                if (profileId.HasValue)
                {
                    sql += " WHERE e.ProfileId = @ProfileId";
                    parameters.Add("@ProfileId", profileId.Value);
                }

                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    var entryResult = connection.Query<Entry, Manga, Format, Publisher, Entry>(
                        sql,
                        (entry, manga, format, publisher) =>
                        {
                            manga.Format = format;
                            manga.Publisher = publisher;
                            entry.Manga = manga;
                            return entry;
                        },
                        parameters,
                        splitOn: "Id,Id,Id"
                    ).ToList();

                    return entryResult;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting entries: {ex.Message}", ex);
            }
        }

        public Entry GetById(int id)
        {
            try
            {
                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var sql = @"
                    SELECT 
                        e.Id, e.MangaId, e.ProfileId, e.Quantity, e.Pending, e.Priority,
                        m.Id, m.Name, m.Volumes
                    FROM [dbo].[Entry] e
                    LEFT JOIN [dbo].[Manga] m ON e.MangaId = m.Id
                    WHERE e.Id = @Id";

                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    var entryResult = connection.Query<Entry, Manga, Entry>(
                        sql,
                        (entry, manga) =>
                        {
                            entry.Manga = manga;
                            return entry;
                        },
                        new { Id = id },
                        splitOn: "Id"
                    ).FirstOrDefault();

                    return entryResult;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting entry with ID {id}: {ex.Message}", ex);
            }
        }

        public Entry Create(Entry entry)
        {
            try
            {
                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var sql = @"
                    INSERT INTO [dbo].[Entry]([MangaId],[ProfileId],[Priority],[Pending],[Quantity]) 
                    VALUES (@MangaId,@ProfileId,@Priority,@Pending,@Quantity);
                    SELECT CAST(SCOPE_IDENTITY() as int);";

                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    var newId = connection.QuerySingle<int>(sql, new
                    {
                        MangaId = entry.MangaId,
                        ProfileId = entry.ProfileId,
                        Priority = entry.Priority,
                        Pending = entry.Pending,
                        Quantity = entry.Quantity
                    });

                    return GetById(newId);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error creating entry: {ex.Message}", ex);
            }
        }

        public Entry Update(Entry entry)
        {
            try
            {
                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var sql = @"
                    UPDATE [dbo].[Entry] 
                    SET [MangaId] = @MangaId, [ProfileId] = @ProfileId, [Priority] = @Priority, 
                        [Pending] = @Pending, [Quantity] = @Quantity 
                    WHERE [Id] = @Id";

                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    connection.Execute(sql, new
                    {
                        Id = entry.Id,
                        MangaId = entry.MangaId,
                        ProfileId = entry.ProfileId,
                        Priority = entry.Priority,
                        Pending = entry.Pending,
                        Quantity = entry.Quantity
                    });

                    return GetById(entry.Id);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error updating entry: {ex.Message}", ex);
            }
        }

        public IEnumerable<Entry> GetEntriesByProfileIds(int profileId1, int profileId2)
        {
            try
            {
                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var sql = @"
                    SELECT 
                        e.Id, e.MangaId, e.ProfileId, e.Quantity, e.Pending, e.Priority,
                        m.Id, m.Name, m.Volumes
                    FROM [dbo].[Entry] e
                    LEFT JOIN [dbo].[Manga] m ON e.MangaId = m.Id
                    WHERE e.ProfileId IN (@ProfileId1, @ProfileId2)";

                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    var entryResult = connection.Query<Entry, Manga, Entry>(
                        sql,
                        (entry, manga) =>
                        {
                            entry.Manga = manga;
                            return entry;
                        },
                        new { ProfileId1 = profileId1, ProfileId2 = profileId2 },
                        splitOn: "Id"
                    ).ToList();

                    return entryResult;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting entries for profiles {profileId1} and {profileId2}: {ex.Message}", ex);
            }
        }
    }
}
