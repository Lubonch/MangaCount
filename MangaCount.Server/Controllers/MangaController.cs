using AutoMapper;
using MangaCount.Server.Configs;
using MangaCount.Server.Domain;
using MangaCount.Server.Model;
using MangaCount.Server.Services.Contracts;
using Microsoft.AspNetCore.Mvc;
using System.Reflection;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MangaController : ControllerBase
    {
        private readonly ILogger<MangaController> _logger;
        private IMangaService _mangaService;
        private Mapper mapper;

        public MangaController(ILogger<MangaController> logger, IMangaService mangaService)
        {
            _logger = logger;
            _mangaService = mangaService;
            mapper = MapperConfig.InitializeAutomapper();
        }

        [HttpGet]
        public List<MangaModel> GetAllMangas()
        {
            return _mangaService.GetAllMangas();
        }

        [HttpGet("{id}")]
        public MangaModel GetMangaById(int id)
        {
            return _mangaService.GetMangaById(id);
        }

        [HttpPost]
        public IActionResult CreateOrUpdateManga([FromBody] Model.MangaModel mangaModel)
        {
            try
            {
                DTO.MangaDTO mangaDTO = mapper.Map<DTO.MangaDTO>(mangaModel);
                var result = _mangaService.SaveOrUpdate(mangaDTO);
                
                if (result.IsSuccessStatusCode)
                {
                    return Ok(new { message = "Manga saved successfully" });
                }
                else
                {
                    return BadRequest(new { message = "Failed to save manga" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving manga");
                return StatusCode(500, new { message = "Error saving manga", detail = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public IActionResult UpdateManga(int id, [FromBody] Model.MangaModel mangaModel)
        {
            if (id <= 0)
            {
                return BadRequest(new { message = "Invalid manga ID" });
            }

            if (mangaModel == null)
            {
                return BadRequest(new { message = "Manga data is required" });
            }

            try
            {
                mangaModel.Id = id;
                DTO.MangaDTO mangaDTO = mapper.Map<DTO.MangaDTO>(mangaModel);
                var result = _mangaService.SaveOrUpdate(mangaDTO);
                
                if (result.IsSuccessStatusCode)
                {
                    return Ok(new { message = "Manga updated successfully" });
                }
                else
                {
                    return BadRequest(new { message = "Failed to update manga" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating manga with ID {Id}", id);
                return StatusCode(500, new { message = "Error updating manga", detail = ex.Message });
            }
        }
    }
}
