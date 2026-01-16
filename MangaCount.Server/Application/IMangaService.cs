using MangaCount.Server.Domain;
using MangaCount.Server.DTO;

namespace MangaCount.Server.Application
{
    public interface IMangaService
    {
        Task<IEnumerable<MangaDto>> GetAllMangasAsync();
        Task<MangaDto?> GetMangaByIdAsync(int id);
        Task<MangaDto> SaveMangaAsync(MangaCreateDto mangaDto);
        Task<MangaDto> UpdateMangaAsync(int id, MangaCreateDto mangaDto);
        Task DeleteMangaAsync(int id);
    }
}