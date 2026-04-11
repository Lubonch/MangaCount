using MangaCount.Server.Model;
using MangaCount.Server.Services.Contracts;

namespace MangaCount.Server.Services
{
    public class RecommendationService : IRecommendationService
    {
        private readonly ILogger<RecommendationService> _logger;
        private readonly IEntryService _entryService;
        private readonly ILocalRecommendationEngine _localRecommendationEngine;
        private readonly IEnumerable<IRecommendationRankingProvider> _rankingProviders;

        public RecommendationService(
            ILogger<RecommendationService> logger,
            IEntryService entryService,
            ILocalRecommendationEngine localRecommendationEngine,
            IEnumerable<IRecommendationRankingProvider> rankingProviders)
        {
            _logger = logger;
            _entryService = entryService;
            _localRecommendationEngine = localRecommendationEngine;
            _rankingProviders = rankingProviders;
        }

        public async Task<RecommendationResponse> GetRecommendationsAsync(int profileId, int limit = 10, CancellationToken ct = default)
        {
            var entries = _entryService.GetAllEntries(profileId);
            var localResponse = await _localRecommendationEngine.GenerateRecommendationsAsync(entries, limit, ct);

            if (!localResponse.IsConfident || string.IsNullOrWhiteSpace(localResponse.InferredCountry) || localResponse.Items.Count == 0)
            {
                return localResponse;
            }

            var context = new RecommendationContext
            {
                Entries = entries,
                BaseResponse = localResponse,
                Candidates = localResponse.Items,
                InferredCountry = localResponse.InferredCountry
            };

            foreach (var provider in _rankingProviders)
            {
                if (!provider.IsConfigured)
                {
                    continue;
                }

                try
                {
                    var rerankedCandidates = await provider.RerankAsync(context, ct);

                    if (rerankedCandidates.Count == 0)
                    {
                        continue;
                    }

                    localResponse.Provider = provider.Name;
                    localResponse.Items = rerankedCandidates.Take(limit).ToList();
                    localResponse.AvailableCount = localResponse.Items.Count;
                    return localResponse;
                }
                catch (OperationCanceledException) when (ct.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Recommendation provider {ProviderName} failed. Falling back.", provider.Name);
                }
            }

            return localResponse;
        }
    }
}