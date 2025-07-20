using MangaCount.Server.Domain;

namespace MangaCount.Server.Repositories.Contracts
{
    public interface IEntryRepository
    {
        IEnumerable<Entry> GetAllEntries(int? profileId = null); // Updated
        Entry GetById(int id);
        Entry Create(Entry entry);
        Entry Update(Entry entry);
        IEnumerable<Entry> GetEntriesByProfileIds(int profileId1, int profileId2); // New method
    }
}
