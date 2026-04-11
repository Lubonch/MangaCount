using MangaCount.Server.Model;

namespace MangaCount.Server.Services.Contracts
{
    public interface IRecommendationService
    {
        Task<RecommendationResponse> GetRecommendationsAsync(int profileId, int limit = 10, CancellationToken ct = default);
    }
}