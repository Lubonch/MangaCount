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

        public IEnumerable<Entry> GetAllEntries()
        {
            try
            {
                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                // Join with Manga table to get manga details
                var sql = @"
                    SELECT 
                        e.Id, e.MangaId, e.Quantity, e.Pending, e.Priority,
                        m.Id, m.Name, m.Volumes
                    FROM [dbo].[Entry] e
                    LEFT JOIN [dbo].[Manga] m ON e.MangaId = m.Id";

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
                        splitOn: "Id"
                    ).ToList();

                    return entryResult;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error getting all entries: {ex.Message}", ex);
            }
        }

        public Entry GetById(int id)
        {
            try
            {
                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var sql = @"
                    SELECT 
                        e.Id, e.MangaId, e.Quantity, e.Pending, e.Priority,
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
                    INSERT INTO [dbo].[Entry]([MangaId],[Priority],[Pending],[Quantity]) 
                    VALUES (@MangaId,@Priority,@Pending,@Quantity);
                    SELECT CAST(SCOPE_IDENTITY() as int);";

                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    var newId = connection.QuerySingle<int>(sql, new
                    {
                        MangaId = entry.MangaId,
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
                    SET [MangaId] = @MangaId, [Priority] = @Priority, [Pending] = @Pending, [Quantity] = @Quantity 
                    WHERE [Id] = @Id";

                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    connection.Execute(sql, new
                    {
                        Id = entry.Id,
                        MangaId = entry.MangaId,
                        Priority = entry.Priority,
                        Pending = entry.Pending,
                        Quantity = entry.Quantity
                    });

                    return GetById(entry.Id);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error updating entry with ID {entry.Id}: {ex.Message}", ex);
            }
        }
    }
}
