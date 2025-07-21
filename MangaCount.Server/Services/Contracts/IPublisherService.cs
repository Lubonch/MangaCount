using MangaCount.Server.Domain;

namespace MangaCount.Server.Services.Contracts
{
    public interface IPublisherService
    {
        IEnumerable<Publisher> GetAll();
        Publisher GetById(int id);
        Publisher Create(Publisher publisher);
        Publisher Update(Publisher publisher);
        void Delete(int id);
    }
}