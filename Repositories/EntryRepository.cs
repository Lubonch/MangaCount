using MangaCount.Domain;
using MangaCount.Repositories.Contracts;
using MangaCount.Configs;

namespace MangaCount.Repositories
{
    public class EntryRepository : NHRepository<Domain.Entry>, IEntryRepository
    {

        public EntryRepository()
        {

        }

        public List<Domain.Entry> GetAllEntries()
        {
            return Session.Query <Domain.Entry>().ToList();
        }
    }
}