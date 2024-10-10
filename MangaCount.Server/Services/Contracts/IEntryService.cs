using MangaCountServer.Configs;
using MangaCountServer.Configs.Contracts;
using MangaCountServer.Repositories.Contracts;
using MangaCountServer.Services.Contracts;
using NHibernate;
using System.Net;
using System.Net.Http;

namespace MangaCountServer.Services.Contracts
{
    public interface IEntryService
    {
        public List<Domain.Entry> GetAllEntries();
        public HttpResponseMessage ImportFromFile(String filePath);
        public Domain.Entry GetEntryById(int Id);
        public HttpResponseMessage SaveOrUpdate(DTO.EntryDTO entryDTO);
    }
}
