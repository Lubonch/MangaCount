namespace MangaCount.Server.Repositories.Contracts
{
    public interface IMangaRepository
    { 
        public List<Domain.Manga> GetAllMangas();
    }
}
