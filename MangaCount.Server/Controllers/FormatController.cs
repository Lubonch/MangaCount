using MangaCount.Server.Domain;
using MangaCount.Server.Services.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FormatController : ControllerBase
    {
        private readonly IFormatService _service;

        public FormatController(IFormatService service)
        {
            _service = service;
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            var formats = _service.GetAll();
            return Ok(formats);
        }

        [HttpGet("{id}")]
        public IActionResult GetById(int id)
        {
            var format = _service.GetById(id);
            if (format == null)
                return NotFound();
            return Ok(format);
        }

        [HttpPost]
        public IActionResult Create([FromBody] Format format)
        {
            var created = _service.Create(format);
            return Ok(created);
        }

        [HttpPut("{id}")]
        public IActionResult Update(int id, [FromBody] Format format)
        {
            var updated = _service.Update(format);
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