[ApiController]
[Route("api/[controller]")]
public class FormatController : ControllerBase
{
    private readonly IFormatService _service;
    public FormatController(IFormatService service) => _service = service;

    [HttpGet] public IActionResult GetAll() => Ok(_service.GetAll());
    [HttpGet("{id}")] public IActionResult GetById(int id) => Ok(_service.GetById(id));
    [HttpPost] public IActionResult Create([FromBody] Format format) => Ok(_service.Create(format));
    [HttpPut("{id}")] public IActionResult Update(int id, [FromBody] Format format) => Ok(_service.Update(format));
    [HttpDelete("{id}")] public IActionResult Delete(int id) { _service.Delete(id); return NoContent(); }
}