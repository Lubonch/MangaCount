using MangaCount.Configs;
using MangaCount.Configs.Contracts;
using MangaCount.Domain;

namespace MangaCount.Repositories.Contracts
{
    public interface IEntryRepository : IRepository<Domain.Entry>
    {
        public List<Domain.Entry> GetAllEntries();
    }
}
