using MangaCount.Configs;
using MangaCount.Configs.Contracts;
using MangaCount.Repositories.Contracts;
using MangaCount.Services.Contracts;
using NHibernate;
using System.Net;
using System.Net.Http;

namespace MangaCount.Services
{
    public class EntryService : IEntryService
    {
        private IEntryRepository _entryRepository;
        public EntryService(IEntryRepository entryRepository)
        {
            _entryRepository = entryRepository;
        }
        public List<Domain.Entry> GetAllEntries()
        {
            var mangaList = _entryRepository.GetAllEntries();

            return mangaList;
        }
    }
}
