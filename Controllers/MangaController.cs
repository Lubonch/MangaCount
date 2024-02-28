using System.Net.Http;
using MangaCount.Services.Contracts;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;


namespace MangaCount.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class MangaController : Controller
    {    
        private readonly ILogger<MangaController> _logger;
        private IMangaService _mangaService;

        public MangaController(ILogger<MangaController> logger, IMangaService mangaService )
        {
            _logger = logger;
            _mangaService = mangaService;
        }

        [HttpGet]
        [Route("~/GetAllMangas/")]
        public IEnumerable<Domain.Manga> GetAllMangas()
        {
            return _mangaService.GetAllMangas();
        }
        [HttpGet]
        [Route("~/GetMangaById/")]
        public Domain.Manga GetMangaById(int Id)
        {
            return _mangaService.GetMangaById(Id);
        }
        [HttpPost]
        [Route("~/CreateManga/")]
        public HttpResponseMessage CreateManga(Domain.Manga mangaData)
        {
            throw new NotImplementedException();
        }
        [HttpPost]
        [Route("~/UpdateManga/")]
        public HttpResponseMessage UpdateManga(Domain.Entry mangaData)
        {
            throw new NotImplementedException();
        }

    }
}
