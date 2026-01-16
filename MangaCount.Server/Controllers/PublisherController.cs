using Microsoft.AspNetCore.Mvc;
using MangaCount.Server.Application;
using MangaCount.Server.Domain;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PublisherController : ControllerBase
    {
        private readonly IPublisherService _publisherService;

        public PublisherController(IPublisherService publisherService)
        {
            _publisherService = publisherService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Publisher>>> GetAllPublishers()
        {
            try
            {
                var publishers = await _publisherService.GetAllPublishersAsync();
                return Ok(publishers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Publisher>> GetPublisher(int id)
        {
            try
            {
                var publisher = await _publisherService.GetPublisherByIdAsync(id);
                if (publisher == null)
                    return NotFound();
                
                return Ok(publisher);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<ActionResult<Publisher>> CreateOrUpdatePublisher(Publisher publisher)
        {
            try
            {
                var savedPublisher = await _publisherService.SavePublisherAsync(publisher);
                if (publisher.Id > 0)
                {
                    return Ok(savedPublisher);
                }
                else
                {
                    return CreatedAtAction(nameof(GetPublisher), new { id = savedPublisher.Id }, savedPublisher);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeletePublisher(int id)
        {
            try
            {
                await _publisherService.DeletePublisherAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}