using Microsoft.AspNetCore.Mvc;
using MangaCount.Server.Application;
using MangaCount.Server.DTO;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EntryController : ControllerBase
    {
        private readonly IEntryService _entryService;

        public EntryController(IEntryService entryService)
        {
            _entryService = entryService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EntryDto>>> GetAllEntries(int? profileId = null)
        {
            try
            {
                var entries = await _entryService.GetAllEntriesAsync(profileId);
                return Ok(entries);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<EntryDto>> GetEntry(int id)
        {
            try
            {
                var entry = await _entryService.GetEntryByIdAsync(id);
                if (entry == null)
                    return NotFound();
                
                return Ok(entry);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<ActionResult<EntryDto>> CreateOrUpdateEntry(EntryCreateDto entryDto)
        {
            try
            {
                var savedEntry = await _entryService.SaveEntryAsync(entryDto);
                if (entryDto.Id.HasValue && entryDto.Id.Value > 0)
                {
                    return Ok(savedEntry);
                }
                else
                {
                    return CreatedAtAction(nameof(GetEntry), new { id = savedEntry.Id }, savedEntry);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("import/{profileId}")]
        public async Task<ActionResult> ImportFromTsv(int profileId, IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest("File is required");

                using var stream = file.OpenReadStream();
                await _entryService.ImportFromTsvAsync(profileId, stream);
                
                return Ok(new { message = "Import successful" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("filters/formats")]
        public async Task<ActionResult<IEnumerable<dynamic>>> GetUsedFormats(int? profileId = null)
        {
            try
            {
                var formats = await _entryService.GetUsedFormatsAsync(profileId);
                return Ok(formats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("filters/publishers")]
        public async Task<ActionResult<IEnumerable<dynamic>>> GetUsedPublishers(int? profileId = null)
        {
            try
            {
                var publishers = await _entryService.GetUsedPublishersAsync(profileId);
                return Ok(publishers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}