using MangaCount.Server.Domain;

namespace MangaCount.Server.Repositories.Contracts
{
    public interface IEntryRepository
    {
        IEnumerable<Entry> GetAllEntries();
        Entry GetById(int id);
        Entry Create(Entry entry);
        Entry Update(Entry entry);
    }
}
