namespace MangaCount.Server.Services
{
    public class OpenRouterRankingProvider : OpenAiCompatibleRankingProviderBase
    {
        private readonly IConfiguration _configuration;

        public OpenRouterRankingProvider(HttpClient httpClient, IConfiguration configuration, ILogger<OpenRouterRankingProvider> logger)
            : base(httpClient, configuration, logger)
        {
            _configuration = configuration;
        }

        public override string Name => "openrouter";
        protected override string ConfigurationSectionName => "OpenRouter";
        protected override string EndpointEnvironmentVariable => "MANGACOUNT_OPENROUTER_ENDPOINT";
        protected override string ApiKeyEnvironmentVariable => "MANGACOUNT_OPENROUTER_API_KEY";
        protected override string ModelEnvironmentVariable => "MANGACOUNT_OPENROUTER_MODEL";
        protected override string? DefaultEndpoint => "https://openrouter.ai/api/v1/chat/completions";

        protected override void AddHeaders(HttpRequestMessage request)
        {
            request.Headers.TryAddWithoutValidation("HTTP-Referer", _configuration["Recommendation:OpenRouter:Referer"] ?? "https://github.com/Lubonch/MangaCount");
            request.Headers.TryAddWithoutValidation("X-Title", _configuration["Recommendation:OpenRouter:Title"] ?? "MangaCount");
        }
    }
}