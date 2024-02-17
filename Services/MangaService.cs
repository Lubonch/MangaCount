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
        private IMangaRepository _consoleRepository;
        public MangaService(IMangaRepository consoleRepository)
        {
            _consoleRepository = consoleRepository;
        }
        public List<Domain.Manga> GetAllMangas()
        {
            var mangaList = _consoleRepository.GetAllMangas();

            return mangaList;
        }
    }
}
