using MangaCount.Server.Domain;

namespace MangaCount.Server.Repositories.Contracts
{
    public interface IMangaRepository
    {
        public Manga Update(Manga manga);
        public Manga Create(Manga manga);
        public Manga GetById(int id);
        public IEnumerable<Manga> GetAllMangas();
    }
}
