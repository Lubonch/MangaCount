using MangaCount.Configs;
using MangaCount.Configs.Contracts;
using MangaCount.Repositories.Contracts;
using MangaCount.Services.Contracts;
using NHibernate;
using System.Net;
using System.Net.Http;

namespace MangaCount.Services.Contracts
{
    public interface IMangaService
    {
        public List<Domain.Manga> GetAllMangas();
        public Domain.Manga GetMangaById(int Id);
        public HttpResponseMessage SaveOrUpdate(DTO.MangaDTO mangaDTO);
    }
}
