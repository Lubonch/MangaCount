using MangaCount.Server.Domain;
using MangaCount.Server.Infrastructure.Repositories;

namespace MangaCount.Server.Application
{
    public class PublisherService : IPublisherService
    {
        private readonly IPublisherRepository _publisherRepository;

        public PublisherService(IPublisherRepository publisherRepository)
        {
            _publisherRepository = publisherRepository;
        }

        public async Task<IEnumerable<Publisher>> GetAllPublishersAsync()
        {
            return await Task.Run(() => _publisherRepository.GetAll());
        }

        public async Task<Publisher?> GetPublisherByIdAsync(int id)
        {
            return await Task.Run(() => _publisherRepository.GetById(id));
        }

        public async Task<Publisher> SavePublisherAsync(Publisher publisher)
        {
            return await Task.Run(() => _publisherRepository.Save(publisher));
        }

        public async Task DeletePublisherAsync(int id)
        {
            await Task.Run(() =>
            {
                var publisher = _publisherRepository.GetById(id);
                if (publisher != null)
                {
                    _publisherRepository.Delete(publisher);
                }
            });
        }
    }
}