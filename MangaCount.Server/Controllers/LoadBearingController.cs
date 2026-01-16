using Microsoft.AspNetCore.Mvc;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LoadBearingController : ControllerBase
    {
        [HttpGet("check")]
        public ActionResult CheckLoadBearingImage()
        {
            try
            {
                var imagePath = Path.Combine(Directory.GetCurrentDirectory(), "loadbearingimage.jpg");
                if (System.IO.File.Exists(imagePath))
                {
                    return Ok(new { message = "Load-bearing image is present", status = "ok" });
                }
                else
                {
                    return NotFound(new { message = "Ah, I wouldn't take it down if I were you. It's a load-bearing image.", status = "missing" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("image")]
        public ActionResult GetLoadBearingImage()
        {
            try
            {
                var imagePath = Path.Combine(Directory.GetCurrentDirectory(), "loadbearingimage.jpg");
                if (!System.IO.File.Exists(imagePath))
                {
                    return NotFound(new { message = "Load-bearing image not found" });
                }

                var imageBytes = System.IO.File.ReadAllBytes(imagePath);
                return File(imageBytes, "image/jpeg");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}