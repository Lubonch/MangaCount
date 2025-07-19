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
                _logger.LogCritical("🚨 STRUCTURAL INTEGRITY COMPROMISED! Load-bearing image missing!");
                return StatusCode(500, new 
                { 
                    status = "CRITICAL_FAILURE",
                    message = "Load-bearing image missing! Building may collapse!",
                    structuralIntegrity = "COMPROMISED",
                    recommendation = "Evacuate immediately and restore loadbearingimage.jpg",
                    simpsonsQuote = "I can't believe that poster was load-bearing!"
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
                bearingLoad = "ENTIRE_SERVER_APPLICATION",
                simpsonsReference = "S9E21 - Girder: That poster was holding up the whole building!",
                location = imagePath
            });
        }

        [HttpGet("image")]
        public IActionResult GetLoadBearingImage()
        {
            var imagePath = Path.Combine(Directory.GetCurrentDirectory(), "loadbearingimage.jpg");
            
            if (!System.IO.File.Exists(imagePath))
            {
                return NotFound(new { message = "💀 Load-bearing image not found! Structure compromised!" });
            }

            var imageBytes = System.IO.File.ReadAllBytes(imagePath);
            return File(imageBytes, "image/jpeg", "loadbearingimage.jpg");
        }
    }
}