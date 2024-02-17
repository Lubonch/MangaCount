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
        
    }
}
