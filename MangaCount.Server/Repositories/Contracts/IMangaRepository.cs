namespace MangaCount.Server.Repositories.Contracts
{
    public interface IMangaRepository
    { 
        public List<Domain.Manga> GetAllMangas();
        public Domain.Manga GetMangaById(int id);
        public void CreateManga(Domain.Manga manga);
    }
}
