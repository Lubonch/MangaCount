using MangaCount.Server.Model;

namespace MangaCount.Server.Services.Contracts
{
    public interface IRecommendationRankingProvider
    {
        string Name { get; }
        bool IsConfigured { get; }
        Task<IReadOnlyList<RecommendationCandidate>> RerankAsync(RecommendationContext context, CancellationToken ct);
    }
}