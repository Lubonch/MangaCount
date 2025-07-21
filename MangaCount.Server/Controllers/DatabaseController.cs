using MangaCount.Server.Services.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DatabaseController : ControllerBase
    {
        private readonly IDatabaseService _databaseService;
        private readonly ILogger<DatabaseController> _logger;

        public DatabaseController(IDatabaseService databaseService, ILogger<DatabaseController> logger)
        {
            _databaseService = databaseService;
            _logger = logger;
        }

        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics()
        {
            try
            {
                var stats = await _databaseService.GetDatabaseStatisticsAsync();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting database statistics");
                return StatusCode(500, new { message = "Error retrieving database statistics" });
            }
        }

        [HttpPost("nuke")]
        public async Task<IActionResult> NukeDatabase([FromBody] NukeConfirmationRequest request)
        {
            if (!request.IsConfirmed || request.ConfirmationText != "DELETE ALL DATA")
            {
                return BadRequest(new { message = "Invalid confirmation" });
            }

            try
            {
                var success = await _databaseService.NukeAllDataAsync();
                
                if (success)
                {
                    return Ok(new { message = "Database successfully cleared" });
                }
                else
                {
                    return StatusCode(500, new { message = "Failed to clear database" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error nuking database");
                return StatusCode(500, new { message = "Error clearing database" });
            }
        }
    }

    public class NukeConfirmationRequest
    {
        public bool IsConfirmed { get; set; }
        public string ConfirmationText { get; set; } = string.Empty;
    }
}