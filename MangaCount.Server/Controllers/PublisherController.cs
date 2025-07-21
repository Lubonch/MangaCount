using MangaCount.Server.Domain;
using MangaCount.Server.Services.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PublisherController : ControllerBase
    {
        private readonly IPublisherService _service;

        public PublisherController(IPublisherService service)
        {
            _service = service;
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            var publishers = _service.GetAll();
            return Ok(publishers);
        }

        [HttpGet("{id}")]
        public IActionResult GetById(int id)
        {
            var publisher = _service.GetById(id);
            if (publisher == null)
                return NotFound();
            return Ok(publisher);
        }

        [HttpPost]
        public IActionResult Create([FromBody] Publisher publisher)
        {
            var created = _service.Create(publisher);
            return Ok(created);
        }

        [HttpPut("{id}")]
        public IActionResult Update(int id, [FromBody] Publisher publisher)
        {
            var updated = _service.Update(publisher);
            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            _service.Delete(id);
            return NoContent();
        }
    }
}