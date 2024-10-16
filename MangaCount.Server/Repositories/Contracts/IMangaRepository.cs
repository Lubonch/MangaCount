namespace MangaCount.Server.Repositories.Contracts
{
    public interface IMangaRepository
    { 
        public List<Domain.Manga> GetAllMangas();
        public Domain.Manga GetMangaById(int id);
        public int CreateManga(Domain.Manga manga);
        public void UpdateManga(Domain.Manga manga);
    }
}
