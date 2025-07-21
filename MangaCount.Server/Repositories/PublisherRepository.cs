using MangaCount.Server.Domain;
using MangaCount.Server.Repositories.Contracts;
using Microsoft.Data.SqlClient;
using Dapper;

public class PublisherRepository : IPublisherRepository
{
    private readonly string _connectionString;
    public PublisherRepository(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("MangacountDatabase");
    }

    public IEnumerable<Publisher> GetAll()
    {
        using var connection = new SqlConnection(_connectionString);
        return connection.Query<Publisher>("SELECT * FROM Publishers");
    }

    public Publisher GetById(int id)
    {
        using var connection = new SqlConnection(_connectionString);
        return connection.QuerySingleOrDefault<Publisher>(
            "SELECT * FROM Publishers WHERE Id = @Id", new { Id = id });
    }

    public Publisher Create(Publisher publisher)
    {
        using var connection = new SqlConnection(_connectionString);
        var id = connection.ExecuteScalar<int>(
            "INSERT INTO Publishers (Name) VALUES (@Name); SELECT CAST(SCOPE_IDENTITY() as int);",
            publisher);
        publisher.Id = id;
        return publisher;
    }

    public Publisher Update(Publisher publisher)
    {
        using var connection = new SqlConnection(_connectionString);
        connection.Execute(
            "UPDATE Publishers SET Name = @Name WHERE Id = @Id", publisher);
        return publisher;
    }

    public void Delete(int id)
    {
        using var connection = new SqlConnection(_connectionString);
        connection.Execute("DELETE FROM Publishers WHERE Id = @Id", new { Id = id });
    }
}