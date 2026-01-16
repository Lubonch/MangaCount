using Microsoft.AspNetCore.Mvc;
using MangaCount.Server.Application;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DatabaseController : ControllerBase
    {
        private readonly IDatabaseService _databaseService;

        public DatabaseController(IDatabaseService databaseService)
        {
            _databaseService = databaseService;
        }

        [HttpPost("nuke/{profileId}")]
        public async Task<ActionResult> NukeProfileData(int profileId)
        {
            try
            {
                await _databaseService.NukeProfileDataAsync(profileId);
                return Ok(new { message = $"All data for profile {profileId} has been deleted" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("backup")]
        public async Task<ActionResult> CreateBackup()
        {
            try
            {
                var result = await _databaseService.CreateBackupAsync();
                return Ok(new { message = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("restore")]
        public async Task<ActionResult> RestoreBackup(IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest("Backup file is required");

                using var stream = file.OpenReadStream();
                await _databaseService.RestoreBackupAsync(stream);
                
                return Ok(new { message = "Backup restored successfully" });
            }
            catch (NotImplementedException)
            {
                return StatusCode(501, "Backup restore functionality not implemented yet");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}