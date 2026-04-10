using Dapper;
using MangaCount.Server.Domain;
using MangaCount.Server.Model;
using MangaCount.Server.Repositories.Contracts;
using Npgsql;
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
                IConfigurationRoot _configuration = new ConfigurationBuilder()
                    .SetBasePath(Directory.GetCurrentDirectory())
                    .AddJsonFile("appsettings.Production.json")
                    .Build();

                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var parameters = new DynamicParameters();
                parameters.Add("@title", manga.Name, DbType.AnsiString, ParameterDirection.Input, manga.Name.Length);
                parameters.Add("@totalvolumes", manga.Volumes, DbType.Int32, ParameterDirection.Input);
                parameters.Add("@formatid", manga.FormatId, DbType.Int32, ParameterDirection.Input);
                parameters.Add("@publisherid", manga.PublisherId, DbType.Int32, ParameterDirection.Input);

                var sql = "INSERT INTO manga (title, totalvolumes, formatid, publisherid) VALUES (@title, @totalvolumes, @formatid, @publisherid) RETURNING id;";

                using (var connection = new NpgsqlConnection(connString))
                {
                    connection.Open();
                    var newId = connection.QuerySingle<int>(sql, parameters);
                    manga.Id = newId;
                    return manga;
                }
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public Manga Update(Manga manga)
        {
            try
            {
                IConfigurationRoot _configuration = new ConfigurationBuilder()
                    .SetBasePath(Directory.GetCurrentDirectory())
                    .AddJsonFile("appsettings.Production.json")
                    .Build();

                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var parameters = new DynamicParameters();
                parameters.Add("@id", manga.Id, DbType.Int32, ParameterDirection.Input);
                parameters.Add("@title", manga.Name, DbType.AnsiString, ParameterDirection.Input, manga.Name.Length);
                parameters.Add("@totalvolumes", manga.Volumes, DbType.Int32, ParameterDirection.Input);
                parameters.Add("@formatid", manga.FormatId, DbType.Int32, ParameterDirection.Input);
                parameters.Add("@publisherid", manga.PublisherId, DbType.Int32, ParameterDirection.Input);

                var sql = "UPDATE manga SET title = @title, totalvolumes = @totalvolumes, formatid = @formatid, publisherid = @publisherid WHERE id = @id";

                using (var connection = new NpgsqlConnection(connString))
                {
                    connection.Open();
                    connection.Execute(sql, parameters);
                    return manga;
                }
            }
            catch (Exception ex)
            {
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

                using (var connection = new NpgsqlConnection(connString))
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
                    .AddJsonFile("appsettings.Production.json")
                    .Build();

                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                var sql = "SELECT id, title AS Name, totalvolumes AS Volumes, formatid AS FormatId, publisherid AS PublisherId FROM manga ORDER BY title;";

                using (var connection = new NpgsqlConnection(connString))
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
