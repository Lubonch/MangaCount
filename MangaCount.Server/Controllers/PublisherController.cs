[ApiController]
[Route("api/[controller]")]
public class PublisherController : ControllerBase
{
    private readonly IPublisherService _service;
    public PublisherController(IPublisherService service) => _service = service;

    [HttpGet] public IActionResult GetAll() => Ok(_service.GetAll());
    [HttpGet("{id}")] public IActionResult GetById(int id) => Ok(_service.GetById(id));
    [HttpPost] public IActionResult Create([FromBody] Publisher publisher) => Ok(_service.Create(publisher));
    [HttpPut("{id}")] public IActionResult Update(int id, [FromBody] Publisher publisher) => Ok(_service.Update(publisher));
    [HttpDelete("{id}")] public IActionResult Delete(int id) { _service.Delete(id); return NoContent(); }
}