using MangaCount.Server.Model;

namespace MangaCount.Server.Services.Contracts
{
    public interface ILocalRecommendationEngine
    {
        Task<RecommendationResponse> GenerateRecommendationsAsync(List<EntryModel> entries, int limit, CancellationToken ct = default);
    }
}