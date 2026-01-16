using Microsoft.AspNetCore.Mvc;
using MangaCount.Server.Application;
using MangaCount.Server.DTO;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProfileController : ControllerBase
    {
        private readonly IProfileService _profileService;

        public ProfileController(IProfileService profileService)
        {
            _profileService = profileService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProfileDto>>> GetAllProfiles()
        {
            try
            {
                var profiles = await _profileService.GetAllProfilesAsync();
                return Ok(profiles);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ProfileDto>> GetProfile(int id)
        {
            try
            {
                var profile = await _profileService.GetProfileByIdAsync(id);
                if (profile == null)
                    return NotFound();
                
                return Ok(profile);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<ActionResult<ProfileDto>> CreateOrUpdateProfile(ProfileCreateDto profileDto)
        {
            try
            {
                var savedProfile = await _profileService.SaveProfileAsync(profileDto);
                if (profileDto.Id.HasValue && profileDto.Id.Value > 0)
                {
                    return Ok(savedProfile);
                }
                else
                {
                    return CreatedAtAction(nameof(GetProfile), new { id = savedProfile.Id }, savedProfile);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("upload-picture/{profileId}")]
        public async Task<ActionResult> UploadProfilePicture(int profileId, IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest("File is required");

                var imagePath = await _profileService.SaveProfilePictureAsync(profileId, file);
                return Ok(new { imagePath });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteProfile(int id)
        {
            try
            {
                await _profileService.DeleteProfileAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("image/{fileName}")]
        public IActionResult GetProfileImage(string fileName)
        {
            try
            {
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "profiles", fileName);
                if (!System.IO.File.Exists(filePath))
                    return NotFound();

                var contentType = "image/jpeg"; // Default to JPEG
                if (fileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase))
                    contentType = "image/png";
                else if (fileName.EndsWith(".gif", StringComparison.OrdinalIgnoreCase))
                    contentType = "image/gif";

                var fileBytes = System.IO.File.ReadAllBytes(filePath);
                return File(fileBytes, contentType);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}