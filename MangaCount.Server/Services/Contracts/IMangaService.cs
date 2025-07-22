using MangaCount.Server.Model;
using System.Threading.Tasks;

namespace MangaCount.Server.Services.Contracts
{
    public interface IMangaService
    {
        public List<MangaModel> GetAllMangas();
        public MangaModel GetMangaById(int Id);
        public HttpResponseMessage SaveOrUpdate(DTO.MangaDTO mangaDTO);
        public Task<string> GetMangaFromISBNAsync(string ISBNCode);
    }
}
