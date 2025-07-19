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
        public ActionResult<IEnumerable<EntryModel>> GetAllEntries()
        {
            try
            {
                var entries = _entryService.GetAllEntries();
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

        [HttpPost("import")]
        public async Task<IActionResult> ImportFromFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded" });
            }

            try
            {
                var result = await _entryService.ImportFromFileAsync(file);
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
        public async Task<IActionResult> CreateOrUpdateEntry([FromBody] Model.EntryModel entryModel)
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
    }
}
