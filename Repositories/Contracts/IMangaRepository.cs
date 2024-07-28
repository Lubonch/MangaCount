using MangaCount.Configs;
using MangaCount.Configs.Contracts;
using MangaCount.Domain;

namespace MangaCount.Repositories.Contracts
{
    public interface IMangaRepository : IRepository<Domain.Manga>
    {
        public List<Domain.Manga> GetAllMangas();
    }
}
