using MangaCount.Server.Domain;
using MangaCount.Server.Repositories.Contracts;
using MangaCount.Server.Services.Contracts;

namespace MangaCount.Server.Services
{
    public class PublisherService : IPublisherService
    {
        private readonly IPublisherRepository _repository;
        
        public PublisherService(IPublisherRepository repository)
        {
            _repository = repository;
        }

        public IEnumerable<Publisher> GetAll() => _repository.GetAll();
        public Publisher GetById(int id) => _repository.GetById(id);
        public Publisher Create(Publisher publisher) => _repository.Create(publisher);
        public Publisher Update(Publisher publisher) => _repository.Update(publisher);
        public void Delete(int id) => _repository.Delete(id);
    }
}