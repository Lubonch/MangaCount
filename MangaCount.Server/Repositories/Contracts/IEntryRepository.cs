using MangaCountServer.Configs;
using MangaCountServer.Configs.Contracts;
using MangaCountServer.Domain;

namespace MangaCountServer.Repositories.Contracts
{
    public interface IEntryRepository : IRepository<Domain.Entry>
    {
        public List<Domain.Entry> GetAllEntries();
    }
}
