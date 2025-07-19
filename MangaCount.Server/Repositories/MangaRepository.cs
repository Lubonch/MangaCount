using Dapper;
using MangaCount.Server.Domain;
using MangaCount.Server.Model;
using MangaCount.Server.Repositories.Contracts;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using System.Data;
using System.Linq;

namespace MangaCount.Server.Repositories
{
    public class MangaRepository : IMangaRepository
    {
        public MangaRepository() 
        {
        }

        public Manga Create(Manga manga)
        {
            try
            {
                Manga mangaResult;

                IConfigurationRoot _configuration = new ConfigurationBuilder()
                    .SetBasePath(Directory.GetCurrentDirectory())
                    .AddJsonFile("appsettings.json")
                    .Build();

                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var parameters = new DynamicParameters();
                parameters.Add("@Name", manga.Name, DbType.AnsiString, ParameterDirection.Input, manga.Name.Length);
                parameters.Add("@Volumes", manga.Volumes, DbType.AnsiString, ParameterDirection.Input, manga.Volumes);

                var sql = "INSERT INTO [dbo].[Manga]([Name],[Volumes])VALUES(@Name,@Volumes) SELECT SCOPE_IDENTITY();";

                
                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    mangaResult = connection.Query<Manga>(sql, parameters).FirstOrDefault();
                }

               

                return mangaResult;
            }
            catch (Exception ex)
            {
                //Logger.Error($"Error in manga creation for Name {manga.Name}", ex);
                throw;
            }
        }

        public Manga Update(Manga manga)
        {
            try
            {
                Manga mangaResult;

                IConfigurationRoot _configuration = new ConfigurationBuilder()
                    .SetBasePath(Directory.GetCurrentDirectory())
                    .AddJsonFile("appsettings.json")
                    .Build();

                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var parameters = new DynamicParameters();
                parameters.Add("@Id", manga.Id, DbType.AnsiString, ParameterDirection.Input, manga.Id);
                parameters.Add("@Name", manga.Name, DbType.AnsiString, ParameterDirection.Input, manga.Name.Length);
                parameters.Add("@Volumes", manga.Volumes, DbType.AnsiString, ParameterDirection.Input, manga.Volumes);

                var sql = "UPDATE [dbo].[Manga] SET [Name] = @Name ,[Volumes] = @Volumes WHERE [Id] = @Id SELECT FROM [dbo].[Manga] WHERE [Id] = @Id;";


                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    mangaResult = connection.Query<Manga>(sql, parameters).FirstOrDefault();
                }



                return mangaResult;
            }
            catch (Exception ex)
            {
                //Logger.Error($"Error in manga update for Name {manga.Name} with Id {manga.Id}", ex);
                throw;
            }
        }

        public Manga GetById(int id)
        {
            try
            {
                Manga mangaResult;

                IConfigurationRoot _configuration = new ConfigurationBuilder()
                    .SetBasePath(Directory.GetCurrentDirectory())
                    .AddJsonFile("appsettings.json")
                    .Build();

                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var parameters = new DynamicParameters();
                parameters.Add("@Id", id, DbType.AnsiString, ParameterDirection.Input, id);

                var sql = "SELECT * FROM [dbo].[Manga] WHERE [Id] = @Id;";


                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    mangaResult = connection.Query<Manga>(sql, parameters).FirstOrDefault();
                }



                return mangaResult;
            }
            catch (Exception ex)
            {
                //Logger.Error($"Error in getting the manga with Id {id}", ex);
                throw;
            }
        }

        public IEnumerable<Manga> GetAllMangas()
        {
            try
            {
                IEnumerable<Manga> mangaResult;

                IConfigurationRoot _configuration = new ConfigurationBuilder()
                    .SetBasePath(Directory.GetCurrentDirectory())
                    .AddJsonFile("appsettings.json")
                    .Build();

                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var sql = "SELECT * FROM [dbo].[Manga];";


                using (var connection = new SqlConnection(connString))
                {
                    connection.Open();
                    mangaResult = connection.Query<Manga>(sql).ToList();
                }
                return mangaResult;
            }
            catch (Exception ex)
            {
                //Logger.Error($"Error in getting the complete manga list", ex);
                throw;
            }
        }
    }
}
