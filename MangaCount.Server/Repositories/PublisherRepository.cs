using MangaCount.Server.Domain;
using MangaCount.Server.Repositories.Contracts;
using Npgsql;
using Dapper;

namespace MangaCount.Server.Repositories
{
    public class PublisherRepository : IPublisherRepository
    {
        private readonly string _connectionString;
        public PublisherRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("MangacountDatabase");
        }

        public IEnumerable<Publisher> GetAll()
        {
            using var connection = new NpgsqlConnection(_connectionString);
            return connection.Query<Publisher>("SELECT id, name FROM publisher");
        }

        public Publisher GetById(int id)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            return connection.QuerySingleOrDefault<Publisher>(
                "SELECT id, name FROM publisher WHERE id = @Id", new { Id = id });
        }

        public Publisher Create(Publisher publisher)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            var id = connection.ExecuteScalar<int>(
                "INSERT INTO publisher (name) VALUES (@Name) RETURNING id;",
                publisher);
            publisher.Id = id;
            return publisher;
        }

        public Publisher Update(Publisher publisher)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            connection.Execute(
                "UPDATE publisher SET name = @Name WHERE id = @Id", publisher);
            return publisher;
        }

        public void Delete(int id)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            connection.Execute("DELETE FROM publisher WHERE id = @Id", new { Id = id });
        }
    }
}