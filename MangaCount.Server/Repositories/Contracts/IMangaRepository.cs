using MangaCountServer.Configs;
using MangaCountServer.Configs.Contracts;
using MangaCountServer.Domain;

namespace MangaCountServer.Repositories.Contracts
{
    public interface IMangaRepository : IRepository<Domain.Manga>
    {
        public List<Domain.Manga> GetAllMangas();
    }
}
