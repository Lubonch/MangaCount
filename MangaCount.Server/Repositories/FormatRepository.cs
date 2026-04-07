using MangaCount.Server.Domain;
using MangaCount.Server.Repositories.Contracts;
using Npgsql;
using Dapper;

namespace MangaCount.Server.Repositories
{
    public class FormatRepository : IFormatRepository
    {
        private readonly string _connectionString;
        public FormatRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("MangacountDatabase");
        }

        public IEnumerable<Format> GetAll()
        {
            using var connection = new NpgsqlConnection(_connectionString);
            return connection.Query<Format>("SELECT id, name FROM format");
        }

        public Format GetById(int id)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            return connection.QuerySingleOrDefault<Format>(
                "SELECT id, name FROM format WHERE id = @Id", new { Id = id });
        }

        public Format Create(Format format)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            var id = connection.ExecuteScalar<int>(
                "INSERT INTO format (name) VALUES (@Name) RETURNING id;",
                format);
            format.Id = id;
            return format;
        }

        public Format Update(Format format)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            connection.Execute(
                "UPDATE format SET name = @Name WHERE id = @Id", format);
            return format;
        }

        public void Delete(int id)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            connection.Execute("DELETE FROM format WHERE id = @Id", new { Id = id });
        }
    }
}