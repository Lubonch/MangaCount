using MangaCount.Server.Configs;
using AutoMapper;
using MangaCount.Server.Services.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace MangaCount.Server.Controllers
{
    public class EntryController : Controller
    {
        private readonly ILogger<EntryController> _logger;
        private IEntryService _entryService;
        private Mapper mapper;

        public EntryController(ILogger<EntryController> logger, IEntryService entryService)
        {
            _logger = logger;
            _entryService = entryService;
            mapper = MapperConfig.InitializeAutomapper();
        }

        [HttpGet]
        [Route("~/GetAllEntries/")]
        public IEnumerable<Domain.Entry> GetAllEntries()
        {
            return _entryService.GetAllEntries();
        }


        //[HttpGet]
        //[Route("~/GetEntryById/")]
        //public Domain.Entry GetEntryById(int Id)
        //{
        //    return _entryService.GetEntryById(Id);
        //}

        //[HttpPost]
        //[Route("~/ImportFromFile/")]
        //public HttpResponseMessage ImportFromFile(String filePath)
        //{
        //    return _entryService.ImportFromFile(filePath);
        //}
        //[HttpPost]
        //[Route("~/CreateEntry/")]
        //public HttpResponseMessage CreateOrUpdateEntry(Model.EntryModel entryModel)
        //{
        //    DTO.EntryDTO entryDTO = mapper.Map<DTO.EntryDTO>(entryModel);

        //    return _entryService.SaveOrUpdate(entryDTO);
        //}
    }
}
