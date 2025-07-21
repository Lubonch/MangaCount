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

        [HttpPost("preview-deletion")]
        public async Task<IActionResult> PreviewDeletion([FromBody] SelectiveDeletionOptions options)
        {
            try
            {
                var preview = await _databaseService.GetDeletionPreviewAsync(options);
                return Ok(preview);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating deletion preview");
                return StatusCode(500, new { message = "Error generating deletion preview" });
            }
        }

        [HttpPost("selective-delete")]
        public async Task<IActionResult> SelectiveDelete([FromBody] SelectiveDeletionRequest request)
        {
            if (!request.IsConfirmed || request.ConfirmationText != "DELETE SELECTED DATA")
            {
                return BadRequest(new { message = "Invalid confirmation. Use 'DELETE SELECTED DATA'" });
            }

            try
            {
                var success = await _databaseService.SelectiveDeleteAsync(request.Options);

                if (success)
                {
                    return Ok(new { message = "Selected data successfully deleted" });
                }
                else
                {
                    return StatusCode(500, new { message = "Failed to delete selected data" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during selective deletion");
                return StatusCode(500, new { message = "Error deleting selected data" });
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

    public class SelectiveDeletionRequest
    {
        public bool IsConfirmed { get; set; }
        public string ConfirmationText { get; set; } = string.Empty;
        public SelectiveDeletionOptions Options { get; set; } = new();
    }
}