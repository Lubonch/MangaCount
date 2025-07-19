using MangaCount.Server.Model;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace MangaCount.Server.Services
{
    public interface IEntryService
    {
        public List<EntryModel> GetAllEntries();
        public EntryModel GetEntryById(int Id);
        public HttpResponseMessage ImportFromFile(String filePath);
        public Task<HttpResponseMessage> ImportFromFileAsync(IFormFile file);
        public HttpResponseMessage SaveOrUpdate(DTO.EntryDTO entryDTO);
    }
}
