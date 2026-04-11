using MangaCount.Server.Services.Contracts;

namespace MangaCount.Server.Services
{
    public class GitHubModelsRankingProvider : OpenAiCompatibleRankingProviderBase
    {
        public GitHubModelsRankingProvider(HttpClient httpClient, IConfiguration configuration, ILogger<GitHubModelsRankingProvider> logger)
            : base(httpClient, configuration, logger)
        {
        }

        public override string Name => "github-models";
        protected override string ConfigurationSectionName => "GitHubModels";
        protected override string EndpointEnvironmentVariable => "MANGACOUNT_GITHUB_MODELS_ENDPOINT";
        protected override string ApiKeyEnvironmentVariable => "MANGACOUNT_GITHUB_MODELS_API_KEY";
        protected override string ModelEnvironmentVariable => "MANGACOUNT_GITHUB_MODELS_MODEL";
    }
}