using MangaCount.Server.Domain;
using MangaCount.Server.Services.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class WeatherForecastController : ControllerBase
    {
        private static readonly string[] Summaries = new[]
        {
            "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
        };

        private readonly ILogger<WeatherForecastController> _logger;
        private IMangaService _mangaService;

        public WeatherForecastController(ILogger<WeatherForecastController> logger, IMangaService mangaService)
        {
            _logger = logger;
            this._mangaService = mangaService;
        }

        [HttpGet(Name = "GetWeatherForecast")]
        public IEnumerable<Manga> Get()
        {
            var test = _mangaService.GetAllMangas().Cast<Domain.Manga>().ToArray();
            return test;
        }
    }
}
