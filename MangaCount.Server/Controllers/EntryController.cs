using AutoMapper;
using MangaCount.Server.Configs;
using MangaCount.Server.Model;
using MangaCount.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EntryController : ControllerBase
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
        public ActionResult<IEnumerable<EntryModel>> GetAllEntries([FromQuery] int? profileId = null)
        {
            try
            {
                var entries = _entryService.GetAllEntries(profileId);
                return Ok(entries);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all entries");
                return StatusCode(500, new { message = "Error retrieving entries", detail = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public ActionResult<EntryModel> GetEntryById(int id)
        {
            try
            {
                var entry = _entryService.GetEntryById(id);
                if (entry == null)
                {
                    return NotFound(new { message = $"Entry with ID {id} not found" });
                }
                return Ok(entry);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting entry with ID {Id}", id);
                return StatusCode(500, new { message = "Error retrieving entry", detail = ex.Message });
            }
        }

        [HttpPost("import/{profileId}")]
        public async Task<IActionResult> ImportFromFile(int profileId, IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded" });
            }

            try
            {
                var result = await _entryService.ImportFromFileAsync(file, profileId);
                return Ok(new { message = "Import successful" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing file");
                return StatusCode(500, new { message = "Import failed", detail = ex.Message });
            }
        }

        [HttpPost]
        public IActionResult CreateOrUpdateEntry([FromBody] Model.EntryModel entryModel)
        {
            try
            {
                DTO.EntryDTO entryDTO = mapper.Map<DTO.EntryDTO>(entryModel);
                var result = _entryService.SaveOrUpdate(entryDTO);
                
                if (result.IsSuccessStatusCode)
                {
                    return Ok(new { message = "Entry saved successfully" });
                }
                else
                {
                    return BadRequest(new { message = "Failed to save entry" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving entry");
                return StatusCode(500, new { message = "Error saving entry", detail = ex.Message });
            }
        }

        // New endpoint to get shared manga between profiles
        [HttpGet("shared/{profileId1}/{profileId2}")]
        public ActionResult<IEnumerable<dynamic>> GetSharedManga(int profileId1, int profileId2)
        {
            try
            {
                var sharedManga = _entryService.GetSharedManga(profileId1, profileId2);
                return Ok(sharedManga);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting shared manga between profiles {ProfileId1} and {ProfileId2}", profileId1, profileId2);
                return StatusCode(500, new { message = "Error retrieving shared manga", detail = ex.Message });
            }
        }

        [HttpGet("filters/formats")]
        public async Task<IActionResult> GetUsedFormats(int? profileId = null)
        {
            try
            {
                var entries = _entryService.GetAllEntries(profileId);
                
                var usedFormats = entries
                    .Where(e => e.Manga?.Format != null)
                    .GroupBy(e => e.Manga.Format.Id)
                    .Select(g => new { 
                        Id = g.Key, 
                        Name = g.First().Manga.Format.Name,
                        Count = g.Count()
                    })
                    .OrderBy(f => f.Name)
                    .ToList();

                return Ok(usedFormats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting used formats for profile {ProfileId}", profileId);
                return StatusCode(500, new { message = "Error retrieving formats" });
            }
        }

        [HttpGet("filters/publishers")]
        public async Task<IActionResult> GetUsedPublishers(int? profileId = null)
        {
            try
            {
                var entries = _entryService.GetAllEntries(profileId);
                
                var usedPublishers = entries
                    .Where(e => e.Manga?.Publisher != null)
                    .GroupBy(e => e.Manga.Publisher.Id)
                    .Select(g => new { 
                        Id = g.Key, 
                        Name = g.First().Manga.Publisher.Name,
                        Count = g.Count()
                    })
                    .OrderBy(p => p.Name)
                    .ToList();

                return Ok(usedPublishers);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting used publishers for profile {ProfileId}", profileId);
                return StatusCode(500, new { message = "Error retrieving publishers" });
            }
        }
    }
}
