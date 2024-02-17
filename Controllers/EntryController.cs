using System.Net.Http;
using MangaCount.Services.Contracts;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;


namespace MangaCount.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class EntryController : Controller
    {    
        private readonly ILogger<EntryController> _logger;
        private IEntryService _entryService;

        public EntryController(ILogger<EntryController> logger, IEntryService entryService )
        {
            _logger = logger;
            _entryService = entryService;
        }

        [HttpGet]
        [Route("~/GetAllEntries/")]
        public IEnumerable<Domain.Entry> GetAllEntries()
        {
            return _entryService.GetAllEntries();
        }
        [HttpPost]
        [Route("~/ImportFromFile/")]
        public IEnumerable<Domain.Entry> ImportFromFile(IFormFile file)
        {
            if (CheckFileType(file.FileName))
            {

            }
            else 
            {
                throw new InvalidOperationException("File Must be a .csv file");
            }
            throw new NotImplementedException();
        }
        public bool CheckFileType(string fileName)
        {
            string ext = Path.GetExtension(fileName);
            switch (ext.ToLower())
            {
                case ".csv":
                    return true;
                default:
                    return false;
            }
        }
    }
}
