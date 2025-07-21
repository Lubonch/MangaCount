using MangaCount.Server.Domain;
using MangaCount.Server.Repositories.Contracts;
using MangaCount.Server.Services.Contracts;

namespace MangaCount.Server.Services
{
    public class FormatService : IFormatService
    {
        private readonly IFormatRepository _repository;
        
        public FormatService(IFormatRepository repository)
        {
            _repository = repository;
        }

        public IEnumerable<Format> GetAll() => _repository.GetAll();
        public Format GetById(int id) => _repository.GetById(id);
        public Format Create(Format format) => _repository.Create(format);
        public Format Update(Format format) => _repository.Update(format);
        public void Delete(int id) => _repository.Delete(id);
    }
}