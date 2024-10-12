namespace MangaCount.Server.Services.Contracts
{
    public interface IMangaService
    {
        public List<Domain.Manga> GetAllMangas();
        //public Domain.Manga GetMangaById(int Id);
        //public HttpResponseMessage SaveOrUpdate(DTO.MangaDTO mangaDTO);
    }
}
