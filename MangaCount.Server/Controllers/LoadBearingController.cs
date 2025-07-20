using Microsoft.AspNetCore.Mvc;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LoadBearingController : ControllerBase
    {
        private readonly ILogger<LoadBearingController> _logger;

        public LoadBearingController(ILogger<LoadBearingController> logger)
        {
            _logger = logger;
        }

        [HttpGet("status")]
        public IActionResult GetLoadBearingStatus()
        {
            var imagePath = Path.Combine(Directory.GetCurrentDirectory(), "loadbearingimage.jpg");
            var exists = System.IO.File.Exists(imagePath);
            
            if (!exists)
            {
                _logger.LogCritical("STRUCTURAL INTEGRITY COMPROMISED! Load-bearing image missing!");
                return StatusCode(500, new 
                { 
                    status = "CRITICAL_FAILURE",
                    message = "Ah, I wouldn't take it down if I were you. It's a load-bearing image.",
                    structuralIntegrity = "COMPROMISED",
                    recommendation = "Restore loadbearingimage.jpg immediately"
                });
            }

            var fileInfo = new FileInfo(imagePath);
            return Ok(new 
            { 
                status = "STABLE",
                message = "Load-bearing image is holding up the entire server infrastructure",
                structuralIntegrity = "CONFIRMED",
                imageSize = fileInfo.Length,
                lastModified = fileInfo.LastWriteTime,
                location = imagePath
            });
        }

        [HttpGet("image")]
        public IActionResult GetLoadBearingImage()
        {
            var imagePath = Path.Combine(Directory.GetCurrentDirectory(), "loadbearingimage.jpg");
            
            if (!System.IO.File.Exists(imagePath))
            {
                return NotFound(new { message = "Load-bearing image not found! Structure compromised!" });
            }

            var imageBytes = System.IO.File.ReadAllBytes(imagePath);
            return File(imageBytes, "image/jpeg", "loadbearingimage.jpg");
        }
    }
}