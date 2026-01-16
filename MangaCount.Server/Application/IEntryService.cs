using MangaCount.Server.Domain;
using MangaCount.Server.DTO;

namespace MangaCount.Server.Application
{
    public interface IEntryService
    {
        Task<IEnumerable<EntryDto>> GetAllEntriesAsync(int? profileId = null);
        Task<EntryDto?> GetEntryByIdAsync(int id);
        Task<EntryDto> SaveEntryAsync(EntryCreateDto entryDto);
        Task DeleteEntryAsync(int id);
        Task<IEnumerable<EntryDto>> GetEntriesByProfileAsync(int profileId);
        Task<IEnumerable<dynamic>> GetUsedFormatsAsync(int? profileId = null);
        Task<IEnumerable<dynamic>> GetUsedPublishersAsync(int? profileId = null);
        Task ImportFromTsvAsync(int profileId, Stream fileStream);
        Task DeleteAllByProfileAsync(int profileId);
    }
}