using MangaCount.Configs;
using MangaCount.Configs.Contracts;
using MangaCount.Repositories.Contracts;
using MangaCount.Services.Contracts;
using NHibernate;
using System.Net;
using System.Net.Http;

namespace MangaCount.Services
{
    public class MangaService : IMangaService
    {
        private IMangaRepository _mangaRepository;
        public MangaService(IMangaRepository mangaRepository)
        {
            _mangaRepository = mangaRepository;
        }
        public List<Domain.Manga> GetAllMangas()
        {
            var mangaList = _mangaRepository.GetAllMangas();

            return mangaList;
        }
        public Domain.Manga GetMangaById(int Id)
        {
            var manga = _mangaRepository.Get(Id);

            return manga;
        }
    }
}
