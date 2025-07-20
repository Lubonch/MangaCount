using MangaCount.Server.Model;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace MangaCount.Server.Services
{
    public interface IEntryService
    {
        public List<EntryModel> GetAllEntries(int? profileId = null); // Updated
        public EntryModel GetEntryById(int Id);
        public HttpResponseMessage ImportFromFile(String filePath);
        public Task<HttpResponseMessage> ImportFromFileAsync(IFormFile file, int profileId); // Updated
        public HttpResponseMessage SaveOrUpdate(DTO.EntryDTO entryDTO);
        public List<dynamic> GetSharedManga(int profileId1, int profileId2); // New method
    }
}
