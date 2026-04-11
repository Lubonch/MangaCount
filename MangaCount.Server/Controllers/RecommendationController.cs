using MangaCount.Server.Model;
using MangaCount.Server.Services.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace MangaCount.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecommendationController : ControllerBase
    {
        private readonly ILogger<RecommendationController> _logger;
        private readonly IRecommendationService _recommendationService;

        public RecommendationController(ILogger<RecommendationController> logger, IRecommendationService recommendationService)
        {
            _logger = logger;
            _recommendationService = recommendationService;
        }

        [HttpGet]
        public async Task<ActionResult<RecommendationResponse>> GetRecommendations([FromQuery] int profileId, [FromQuery] int limit = 10, CancellationToken ct = default)
        {
            if (profileId <= 0)
            {
                return BadRequest(new { message = "A valid profileId is required." });
            }

            var safeLimit = Math.Clamp(limit, 1, 10);

            try
            {
                var recommendations = await _recommendationService.GetRecommendationsAsync(profileId, safeLimit, ct);
                return Ok(recommendations);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                _logger.LogInformation("Recommendation request for profile {ProfileId} was cancelled.", profileId);
                return new EmptyResult();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating recommendations for profile {ProfileId}", profileId);
                return StatusCode(500, new { message = "Error generating recommendations", detail = ex.Message });
            }
        }
    }
}