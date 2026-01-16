using MangaCount.Server.Domain;

namespace MangaCount.Server.Application
{
    public interface IFormatService
    {
        Task<IEnumerable<Format>> GetAllFormatsAsync();
        Task<Format?> GetFormatByIdAsync(int id);
        Task<Format> SaveFormatAsync(Format format);
        Task DeleteFormatAsync(int id);
    }
}