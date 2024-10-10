using MangaCountServer.Domain;
using MangaCountServer.Repositories.Contracts;
using MangaCountServer.Configs;

namespace MangaCountServer.Repositories
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