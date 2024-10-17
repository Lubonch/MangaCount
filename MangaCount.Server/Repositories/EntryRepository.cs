using Dapper;
using MangaCount.Server.Domain;
using MangaCount.Server.Repositories.Contracts;
using System.Data.SqlClient;
using System.Data;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace MangaCount.Server.Repositories
{
    public class EntryRepository : IEntryRepository
    {
        IConfiguration _configuration;
        string connString;
        public EntryRepository()
        {
            this._configuration = new ConfigurationBuilder()
           .SetBasePath("C:\\repos\\MangaCount\\MangaCount.Server")
           .AddJsonFile("appsettings.json")
           .Build();
            this.connString = _configuration.GetConnectionString("MangaCountDatabase")!;
        }

        public int CreateEntry(Entry entry)
        {
            int idCreation;
            var parameters = new DynamicParameters();
            
            parameters.Add("@MangaId", entry.Manga.Id, DbType.Int64, ParameterDirection.Input);
            parameters.Add("@Priority", entry.Priority, DbType.Boolean, ParameterDirection.Input);
            parameters.Add("@Pending", entry.Pending, DbType.String, ParameterDirection.Input);
            parameters.Add("@Quantity", entry.Quantity, DbType.Int64, ParameterDirection.Input);


            var sql = "INSERT INTO [dbo].[Entry] ([MangaId],[Priority],[Pending],[Quantity])" +
                      "VALUES (@MangaId, @Priority, @Pending, @Quantity) " +
                      "SELECT CAST(SCOPE_IDENTITY() AS INT);";
            using (var connection = new SqlConnection(this.connString))
            {
                connection.Open();
                idCreation = connection.Query<int>(sql, parameters).FirstOrDefault();
            }

            return idCreation;
        }

        public List<Entry> GetAllEntries()
        {
            var products = new List<Entry>();
            var sql = "Select * FROM Entry e " +
                "INNER JOIN Manga m ON e.MangaID = m.Id";
            using (var connection = new SqlConnection(this.connString))
            {
                products = connection.Query<Entry, Manga, Entry>(sql, (entry, manga) => {
                    entry.Manga = manga;
                    return entry;
                } ).ToList();
            }
            return products;
        }
    }
}
