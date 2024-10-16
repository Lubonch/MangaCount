using MangaCount.Server.Domain;

namespace MangaCount.Server.Repositories.Contracts
{
    public interface IEntryRepository
    {
        public List<Entry> GetAllEntries();
        public int CreateEntry(Entry entry);
    }
}
