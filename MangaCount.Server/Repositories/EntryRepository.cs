using Dapper;
using MangaCount.Server.Domain;
using MangaCount.Server.Repositories.Contracts;
using Npgsql;
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
                e.id, e.mangaid AS MangaId, e.profileid AS ProfileId, e.purchasedvolumes AS Quantity, e.pendingvolumes AS Pending, e.ispriority AS Priority,
                m.id, m.title AS Name, m.totalvolumes AS Volumes, m.formatid AS FormatId, m.publisherid AS PublisherId,
                f.id, f.name,
                p.id, p.name
            FROM entry e
            LEFT JOIN manga m ON e.mangaid = m.id
            LEFT JOIN format f ON m.formatid = f.id
            LEFT JOIN publisher p ON m.publisherid = p.id";

                var parameters = new DynamicParameters();

                if (profileId.HasValue)
                {
                    sql += " WHERE e.profileid = @ProfileId";
                    parameters.Add("@ProfileId", profileId.Value);
                }

                using (var connection = new NpgsqlConnection(connString))
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
                        e.id, e.mangaid AS MangaId, e.profileid AS ProfileId, e.purchasedvolumes AS Quantity, e.pendingvolumes AS Pending, e.ispriority AS Priority,
                        m.id, m.title AS Name, m.totalvolumes AS Volumes, m.formatid AS FormatId, m.publisherid AS PublisherId
                    FROM entry e
                    LEFT JOIN manga m ON e.mangaid = m.id
                    WHERE e.id = @Id";

                using (var connection = new NpgsqlConnection(connString))
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
                    INSERT INTO entry (mangaid, profileid, purchasedvolumes, pendingvolumes, ispriority) 
                    VALUES (@MangaId, @ProfileId, @Quantity, @Pending, @Priority)
                    ON CONFLICT (profileid, mangaid) DO UPDATE
                        SET purchasedvolumes = EXCLUDED.purchasedvolumes,
                            pendingvolumes = EXCLUDED.pendingvolumes,
                            ispriority = EXCLUDED.ispriority
                    RETURNING id;";

                using (var connection = new NpgsqlConnection(connString))
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
                    UPDATE entry 
                    SET mangaid = @MangaId, profileid = @ProfileId, ispriority = @Priority, 
                        pendingvolumes = @Pending, purchasedvolumes = @Quantity 
                    WHERE id = @Id";

                using (var connection = new NpgsqlConnection(connString))
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
                        e.id, e.mangaid AS MangaId, e.profileid AS ProfileId, e.purchasedvolumes AS Quantity, e.pendingvolumes AS Pending, e.ispriority AS Priority,
                        m.id, m.title AS Name, m.totalvolumes AS Volumes, m.formatid AS FormatId, m.publisherid AS PublisherId
                    FROM entry e
                    LEFT JOIN manga m ON e.mangaid = m.id
                    WHERE e.profileid IN (@ProfileId1, @ProfileId2)";

                using (var connection = new NpgsqlConnection(connString))
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
