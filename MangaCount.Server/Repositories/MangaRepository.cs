using MangaCount.Server.Domain;
using MangaCount.Server.Repositories.Contracts;
using System.Data.SqlClient;
using Dapper;
using Microsoft.Data.Sqlite;

namespace MangaCount.Server.Repositories
{
    public class MangaRepository : IMangaRepository
    {
        public MangaRepository()
        {

        }

        public List<Domain.Manga> GetAllMangas()
        {
            IConfigurationRoot _configuration = new ConfigurationBuilder()
           .SetBasePath("C:\\repos\\MangaCount\\MangaCount.Server")
           .AddJsonFile("appsettings.json")
           .Build();

            string connString = _configuration.GetConnectionString("MangaCountDatabase")!;
            //var connString = app.Configuration.GetConnectionString("MangaCountDatabase");
            var sql = "select * from Manga";
            var products = new List<Manga>();
            using (var connection = new SqlConnection(connString))
            {
                connection.Open();
                products = connection.Query<Manga>(sql).ToList();
            }

            return products;
        }
    }
}
