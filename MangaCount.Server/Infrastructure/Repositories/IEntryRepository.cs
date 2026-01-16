using MangaCount.Server.Domain;

namespace MangaCount.Server.Infrastructure.Repositories
{
    public interface IEntryRepository
    {
        Entry? GetById(int id);
        IEnumerable<Entry> GetAll(int? profileId = null);
        Entry Save(Entry entry);
        void Delete(Entry entry);
        IEnumerable<Entry> GetByProfileId(int profileId);
        IEnumerable<dynamic> GetUsedFormats(int? profileId = null);
        IEnumerable<dynamic> GetUsedPublishers(int? profileId = null);
        void DeleteAllByProfile(int profileId);
    }
}