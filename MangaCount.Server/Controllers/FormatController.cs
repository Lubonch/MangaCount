using Microsoft.AspNetCore.Mvc;
using MangaCount.Server.Application;
using MangaCount.Server.Domain;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FormatController : ControllerBase
    {
        private readonly IFormatService _formatService;

        public FormatController(IFormatService formatService)
        {
            _formatService = formatService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Format>>> GetAllFormats()
        {
            try
            {
                var formats = await _formatService.GetAllFormatsAsync();
                return Ok(formats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Format>> GetFormat(int id)
        {
            try
            {
                var format = await _formatService.GetFormatByIdAsync(id);
                if (format == null)
                    return NotFound();
                
                return Ok(format);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<ActionResult<Format>> CreateOrUpdateFormat(Format format)
        {
            try
            {
                var savedFormat = await _formatService.SaveFormatAsync(format);
                if (format.Id > 0)
                {
                    return Ok(savedFormat);
                }
                else
                {
                    return CreatedAtAction(nameof(GetFormat), new { id = savedFormat.Id }, savedFormat);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteFormat(int id)
        {
            try
            {
                await _formatService.DeleteFormatAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}