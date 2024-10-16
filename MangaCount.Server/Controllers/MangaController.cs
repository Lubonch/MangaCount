﻿using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using Microsoft.AspNetCore.Http;
using MangaCount.Server.Services.Contracts;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class MangaController : Controller
    {
        private readonly ILogger<MangaController> _logger;
        private IMangaService _mangaService;
        //private Mapper mapper;

        public MangaController(ILogger<MangaController> logger, IMangaService mangaService)
        {
            _logger = logger;
            _mangaService = mangaService;
            //mapper = MapperConfig.InitializeAutomapper();
        }

        [HttpGet(Name = "GetAllMangas")]
        public IEnumerable<Domain.Manga> GetAllMangas()
        {
            var test =_mangaService.GetAllMangas().Cast<Domain.Manga>().ToArray();
            return test; 
        }
        //[HttpGet]
        //[Route("~/GetMangaById/")]
        //public Domain.Manga GetMangaById(int Id)
        //{
        //    return _mangaService.GetMangaById(Id);
        //}
        //[HttpPost]
        //[Route("~/CreateManga/")]
        //public HttpResponseMessage CreateOrUpdateManga(Model.MangaModel mangaModel)
        //{
        //    DTO.MangaDTO mangaDTO = mapper.Map<DTO.MangaDTO>(mangaModel);

        //    return _mangaService.SaveOrUpdate(mangaDTO);
        //}
    }
}
