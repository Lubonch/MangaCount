using MangaCount.Server.Domain;
using MangaCount.Server.Repositories.Contracts;
using Microsoft.Data.SqlClient;
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
            using var connection = new SqlConnection(_connectionString);
            return connection.Query<Format>("SELECT * FROM Formats");
        }

        public Format GetById(int id)
        {
            using var connection = new SqlConnection(_connectionString);
            return connection.QuerySingleOrDefault<Format>(
                "SELECT * FROM Formats WHERE Id = @Id", new { Id = id });
        }

        public Format Create(Format format)
        {
            using var connection = new SqlConnection(_connectionString);
            var id = connection.ExecuteScalar<int>(
                "INSERT INTO Formats (Name) VALUES (@Name); SELECT CAST(SCOPE_IDENTITY() as int);",
                format);
            format.Id = id;
            return format;
        }

        public Format Update(Format format)
        {
            using var connection = new SqlConnection(_connectionString);
            connection.Execute(
                "UPDATE Formats SET Name = @Name WHERE Id = @Id", format);
            return format;
        }

        public void Delete(int id)
        {
            using var connection = new SqlConnection(_connectionString);
            connection.Execute("DELETE FROM Formats WHERE Id = @Id", new { Id = id });
        }
    }
}