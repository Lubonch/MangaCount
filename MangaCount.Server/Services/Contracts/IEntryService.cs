namespace MangaCount.Server.Services.Contracts
{
    public interface IEntryService
    {
        public List<Domain.Entry> GetAllEntries();
        public HttpResponseMessage ImportFromFile(String filePath);
        public Domain.Entry GetEntryById(int Id);
        public HttpResponseMessage SaveOrUpdate(DTO.EntryDTO entryDTO);
    }
}
