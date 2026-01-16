using MangaCount.Server.Domain;

namespace MangaCount.Server.Infrastructure.Repositories
{
    public interface IPublisherRepository
    {
        Publisher? GetById(int id);
        IEnumerable<Publisher> GetAll();
        Publisher Save(Publisher publisher);
        void Delete(Publisher publisher);
    }
}