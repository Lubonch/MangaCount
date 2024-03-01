using System.Net.Http;
using AutoMapper;
using MangaCount.Configs;
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
        private Mapper mapper;

        public MangaController(ILogger<MangaController> logger, IMangaService mangaService )
        {
            _logger = logger;
            _mangaService = mangaService;
             mapper = MapperConfig.InitializeAutomapper();
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
        public HttpResponseMessage CreateManga(Model.MangaModel mangaModel)
        {
            DTO.MangaDTO mangaDTO = mapper.Map<DTO.MangaDTO>(mangaModel);

            return _mangaService.SaveOrUpdate(mangaDTO);
        }
        [HttpPost]
        [Route("~/UpdateManga/")]
        public HttpResponseMessage UpdateManga(Model.MangaModel mangaModel)
        {
            DTO.MangaDTO mangaDTO = mapper.Map<DTO.MangaDTO>(mangaModel);

            return _mangaService.SaveOrUpdate(mangaDTO);
        }

    }
}
