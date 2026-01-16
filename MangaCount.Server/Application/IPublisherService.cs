using MangaCount.Server.Domain;

namespace MangaCount.Server.Application
{
    public interface IPublisherService
    {
        Task<IEnumerable<Publisher>> GetAllPublishersAsync();
        Task<Publisher?> GetPublisherByIdAsync(int id);
        Task<Publisher> SavePublisherAsync(Publisher publisher);
        Task DeletePublisherAsync(int id);
    }
}