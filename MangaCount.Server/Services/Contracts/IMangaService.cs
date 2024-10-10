using MangaCountServer.Configs;
using MangaCountServer.Configs.Contracts;
using MangaCountServer.Repositories.Contracts;
using MangaCountServer.Services.Contracts;
using NHibernate;
using System.Net;
using System.Net.Http;

namespace MangaCountServer.Services.Contracts
{
    public interface IMangaService
    {
        public List<Domain.Manga> GetAllMangas();
        public Domain.Manga GetMangaById(int Id);
        public HttpResponseMessage SaveOrUpdate(DTO.MangaDTO mangaDTO);
    }
}
