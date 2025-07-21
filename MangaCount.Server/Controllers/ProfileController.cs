using AutoMapper;
using MangaCount.Server.Configs;
using MangaCount.Server.Model;
using MangaCount.Server.Services.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProfileController : ControllerBase
    {
        private readonly ILogger<ProfileController> _logger;
        private readonly IProfileService _profileService;
        private readonly Mapper _mapper;

        public ProfileController(ILogger<ProfileController> logger, IProfileService profileService)
        {
            _logger = logger;
            _profileService = profileService;
            _mapper = MapperConfig.InitializeAutomapper();
        }

        [HttpGet]
        public ActionResult<IEnumerable<ProfileModel>> GetAllProfiles()
        {
            try
            {
                var profiles = _profileService.GetAllProfiles();
                return Ok(profiles);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all profiles");
                return StatusCode(500, new { message = "Error retrieving profiles", detail = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public ActionResult<ProfileModel> GetProfileById(int id)
        {
            try
            {
                var profile = _profileService.GetProfileById(id);
                if (profile == null)
                {
                    return NotFound(new { message = $"Profile with ID {id} not found" });
                }
                return Ok(profile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting profile with ID {Id}", id);
                return StatusCode(500, new { message = "Error retrieving profile", detail = ex.Message });
            }
        }

        [HttpPost]
        public IActionResult CreateOrUpdateProfile([FromBody] ProfileModel profileModel)
        {
            try
            {
                _logger.LogInformation("CreateOrUpdateProfile called with profile: Id={Id}, Name={Name}", 
                    profileModel.Id, profileModel.Name);
                    
                var profileDTO = _mapper.Map<DTO.ProfileDTO>(profileModel);
                var result = _profileService.SaveOrUpdate(profileDTO);
                
                if (result.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Profile saved successfully: Id={Id}, Name={Name}", 
                        profileModel.Id, profileModel.Name);
                    return Ok(new { message = "Profile saved successfully" });
                }
                else
                {
                    return BadRequest(new { message = "Failed to save profile" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving profile");
                return StatusCode(500, new { message = "Error saving profile", detail = ex.Message });
            }
        }

        [HttpPost("upload-picture/{profileId}")]
        public async Task<IActionResult> UploadProfilePicture(int profileId, IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded" });
            }

            if (!IsImageFile(file))
            {
                return BadRequest(new { message = "Only image files are allowed" });
            }

            try
            {
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "profiles");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                var fileName = $"profile_{profileId}_{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
                var filePath = Path.Combine(uploadsFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Use API endpoint instead of static file
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var profilePictureUrl = $"{baseUrl}/api/Profile/image/{fileName}";

                // Update profile with new picture URL - ONLY if profile exists
                var profile = _profileService.GetProfileById(profileId);
                if (profile != null)
                {
                    profile.ProfilePicture = profilePictureUrl;
                    var profileDTO = _mapper.Map<DTO.ProfileDTO>(profile);
                    var updateResult = _profileService.SaveOrUpdate(profileDTO);
                    
                    if (!updateResult.IsSuccessStatusCode)
                    {
                        _logger.LogWarning("Failed to update profile {ProfileId} with picture URL", profileId);
                        // Still return success for the file upload, but log the issue
                    }
                }
                else
                {
                    _logger.LogWarning("Profile {ProfileId} not found when trying to update picture URL", profileId);
                    // Still return the URL even if profile update failed
                }

                return Ok(new { profilePictureUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading profile picture");
                return StatusCode(500, new { message = "Error uploading picture", detail = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteProfile(int id)
        {
            try
            {
                _profileService.DeleteProfile(id);
                return Ok(new { message = "Profile deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting profile with ID {Id}", id);
                return StatusCode(500, new { message = "Error deleting profile", detail = ex.Message });
            }
        }

        [HttpGet("image/{fileName}")]
        public IActionResult GetProfileImage(string fileName)
        {
            try
            {
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "profiles", fileName);
                
                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound(new { message = $"Image file {fileName} not found" });
                }

                var imageBytes = System.IO.File.ReadAllBytes(filePath);
                var extension = Path.GetExtension(fileName).ToLowerInvariant();
                
                var contentType = extension switch
                {
                    ".jpg" or ".jpeg" => "image/jpeg",
                    ".png" => "image/png",
                    ".gif" => "image/gif",
                    ".bmp" => "image/bmp",
                    _ => "application/octet-stream"
                };

                return File(imageBytes, contentType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error serving profile image {FileName}", fileName);
                return StatusCode(500, new { message = "Error serving image", detail = ex.Message });
            }
        }

        private bool IsImageFile(IFormFile file)
        {
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".bmp" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            return allowedExtensions.Contains(extension);
        }
    }
}