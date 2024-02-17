using MangaCount.Domain;
using MangaCount.Repositories.Contracts;
using MangaCount.Configs;

namespace MangaCount.Repositories
{
    public class MangaRepository : NHRepository<Domain.Manga>, IMangaRepository
    {

        public MangaRepository()
        {

        }

        public List<Domain.Manga> GetAllMangas()
        {
            return Session.Query<Domain.Manga>().ToList();
        }
    }
}