using MangaCountServer.Domain;
using MangaCountServer.Repositories.Contracts;
using MangaCountServer.Configs;

namespace MangaCountServer.Repositories
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