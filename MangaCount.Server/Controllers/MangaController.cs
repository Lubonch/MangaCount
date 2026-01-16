using Microsoft.AspNetCore.Mvc;
using MangaCount.Server.Application;
using MangaCount.Server.DTO;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MangaController : ControllerBase
    {
        private readonly IMangaService _mangaService;

        public MangaController(IMangaService mangaService)
        {
            _mangaService = mangaService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<MangaDto>>> GetAllMangas()
        {
            try
            {
                var mangas = await _mangaService.GetAllMangasAsync();
                return Ok(mangas);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<MangaDto>> GetManga(int id)
        {
            try
            {
                var manga = await _mangaService.GetMangaByIdAsync(id);
                if (manga == null)
                    return NotFound();
                
                return Ok(manga);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<ActionResult<MangaDto>> CreateOrUpdateManga(MangaCreateDto mangaDto)
        {
            try
            {
                if (mangaDto.Id.HasValue && mangaDto.Id.Value > 0)
                {
                    var updatedManga = await _mangaService.UpdateMangaAsync(mangaDto.Id.Value, mangaDto);
                    return Ok(updatedManga);
                }
                else
                {
                    var createdManga = await _mangaService.SaveMangaAsync(mangaDto);
                    return CreatedAtAction(nameof(GetManga), new { id = createdManga.Id }, createdManga);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<MangaDto>> UpdateManga(int id, MangaCreateDto mangaDto)
        {
            try
            {
                var updatedManga = await _mangaService.UpdateMangaAsync(id, mangaDto);
                return Ok(updatedManga);
            }
            catch (ArgumentException)
            {
                return NotFound();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}