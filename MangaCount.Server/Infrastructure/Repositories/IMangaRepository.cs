using MangaCount.Server.Domain;

namespace MangaCount.Server.Infrastructure.Repositories
{
    public interface IMangaRepository
    {
        Manga? GetById(int id);
        IEnumerable<Manga> GetAll();
        Manga Save(Manga manga);
        void Delete(Manga manga);
    }
}