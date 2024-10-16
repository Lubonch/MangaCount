using MangaCount.Server.Domain;
using MangaCount.Server.Repositories.Contracts;
using System.Data.SqlClient;
using Dapper;
using Microsoft.Data.Sqlite;
using System.Data;

namespace MangaCount.Server.Repositories
{
    public class MangaRepository : IMangaRepository
    {
        IConfiguration _configuration;
        string connString;
        public MangaRepository()
        {
            this._configuration = new ConfigurationBuilder()
           .SetBasePath("C:\\repos\\MangaCount\\MangaCount.Server")
           .AddJsonFile("appsettings.json")
           .Build();
            this.connString = _configuration.GetConnectionString("MangaCountDatabase")!;
        }

        public List<Domain.Manga> GetAllMangas()
        {
            
            var sql = "select * from Manga";
            var products = new List<Manga>();
            using (var connection = new SqlConnection(this.connString))
            {
                connection.Open();
                products = connection.Query<Manga>(sql).ToList();
            }

            return products;
        }
        public Domain.Manga GetMangaById(int Id)
        {
            var parameters = new DynamicParameters();
            parameters.Add("@Id", Id, DbType.Int64, ParameterDirection.Input);
            var sql = "select * from Manga where Id = @Id";
            Manga products;
            using (var connection = new SqlConnection(this.connString))
            {
                connection.Open();
                products = connection.Query<Manga>(sql, parameters).FirstOrDefault()!;
            }

            return products;
        }

        public int CreateManga(Domain.Manga manga)
        {
            int idCreation;

            var parameters = new DynamicParameters();
            parameters.Add("@Name", manga.Name, DbType.String, ParameterDirection.Input);
            parameters.Add("@Volumes", manga.Volumes, DbType.Int64, ParameterDirection.Input);


            var sql = "INSERT INTO [dbo].[Manga]([Name],[Volumes]) VALUES (@Name, @Volumes)";
            using (var connection = new SqlConnection(this.connString))
            {
                connection.Open();
                idCreation = connection.Query<int>(sql, parameters).FirstOrDefault();
            }

            return idCreation;
        }

        public void UpdateManga(Domain.Manga manga)
        {
            var parameters = new DynamicParameters();

            parameters.Add("@Name", manga.Name, DbType.String, ParameterDirection.Input);
            parameters.Add("@Volumes", manga.Volumes, DbType.Int64, ParameterDirection.Input);
            parameters.Add("@Id", manga.Id, DbType.Int64, ParameterDirection.Input);

            var sql = "UPDATE [dbo].[Manga] SET [Name] =@Name ,[Volumes] =@Volumes WHERE Id = @Id";

            using (var connection = new SqlConnection(this.connString))
            {
                connection.Open();
                var products = connection.Query<Manga>(sql, parameters);
            }
        }
    }
}
