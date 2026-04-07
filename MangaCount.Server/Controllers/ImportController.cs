using Microsoft.AspNetCore.Mvc;
using MangaCount.Server.Domain;
using MangaCount.Server.Services.Contracts;
using MangaCount.Server.Services;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImportController : ControllerBase
    {
        private readonly ILogger<ImportController> _logger;
        private readonly IEntryService _entryService;

        public ImportController(
            ILogger<ImportController> logger, 
            IEntryService entryService)
        {
            _logger = logger;
            _entryService = entryService;
        }

        [HttpPost("tsv")]
        public async Task<IActionResult> ImportTsv(IFormFile file, [FromForm] int profileId = 1)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded");

            if (!file.FileName.EndsWith(".tsv"))
                return BadRequest("Only TSV files are supported");

            try
            {
                _logger.LogInformation($"Starting TSV import for profile {profileId}");
                
                // Use existing ImportFromFileAsync method
                var result = await _entryService.ImportFromFileAsync(file, profileId);
                
                return Ok(new { 
                    Success = true, 
                    Message = "TSV import completed successfully",
                    ProfileId = profileId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing TSV");
                return StatusCode(500, $"Import failed: {ex.Message}");
            }
        }

        [HttpPost("clear")]
        public IActionResult Clear()
        {
            return Ok(new { Message = "Clear not implemented yet - use SQL directly" });
        }
    }
}