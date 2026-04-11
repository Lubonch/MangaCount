using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using MangaCount.Server.Model;
using MangaCount.Server.Services.Contracts;

namespace MangaCount.Server.Services
{
    public abstract class OpenAiCompatibleRankingProviderBase : IRecommendationRankingProvider
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger _logger;
        protected readonly HttpClient HttpClient;

        protected OpenAiCompatibleRankingProviderBase(HttpClient httpClient, IConfiguration configuration, ILogger logger)
        {
            HttpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        public abstract string Name { get; }
        protected abstract string ConfigurationSectionName { get; }
        protected abstract string EndpointEnvironmentVariable { get; }
        protected abstract string ApiKeyEnvironmentVariable { get; }
        protected abstract string ModelEnvironmentVariable { get; }
        protected virtual string? DefaultEndpoint => null;

        public bool IsConfigured =>
            IsEnabled() &&
            !string.IsNullOrWhiteSpace(GetEndpoint()) &&
            !string.IsNullOrWhiteSpace(GetApiKey()) &&
            !string.IsNullOrWhiteSpace(GetModel());

        public async Task<IReadOnlyList<RecommendationCandidate>> RerankAsync(RecommendationContext context, CancellationToken ct)
        {
            if (!IsConfigured)
            {
                throw new InvalidOperationException($"Provider '{Name}' is not configured.");
            }

            if (context.Candidates.Count == 0)
            {
                return context.Candidates;
            }

            using var request = new HttpRequestMessage(HttpMethod.Post, GetEndpoint());
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", GetApiKey());
            AddHeaders(request);
            request.Content = JsonContent.Create(new
            {
                model = GetModel(),
                temperature = 0.1,
                messages = new object[]
                {
                    new
                    {
                        role = "system",
                        content = "You rerank manga recommendations. Return JSON only with an orderedIds array using the candidate ids you receive. Never add new ids."
                    },
                    new
                    {
                        role = "user",
                        content = BuildPrompt(context)
                    }
                }
            });

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(GetTimeout());

            using var response = await HttpClient.SendAsync(request, timeoutCts.Token);
            response.EnsureSuccessStatusCode();

            var payload = await response.Content.ReadAsStringAsync(timeoutCts.Token);
            var orderedIds = ParseOrderedIds(payload);
            var reranked = ApplyOrder(context.Candidates, orderedIds);

            if (reranked.Count == 0)
            {
                throw new InvalidOperationException($"Provider '{Name}' returned no valid candidate ids.");
            }

            return reranked;
        }

        protected virtual void AddHeaders(HttpRequestMessage request)
        {
        }

        private bool IsEnabled()
        {
            var configuredValue = _configuration[$"Recommendation:{ConfigurationSectionName}:Enabled"];
            return !bool.TryParse(configuredValue, out var enabled) || enabled;
        }

        private TimeSpan GetTimeout()
        {
            var configuredValue = _configuration["Recommendation:RemoteTimeoutSeconds"];
            return int.TryParse(configuredValue, out var seconds) && seconds > 0
                ? TimeSpan.FromSeconds(seconds)
                : TimeSpan.FromSeconds(8);
        }

        protected string? GetEndpoint()
        {
            return Environment.GetEnvironmentVariable(EndpointEnvironmentVariable)
                ?? _configuration[$"Recommendation:{ConfigurationSectionName}:Endpoint"]
                ?? DefaultEndpoint;
        }

        protected string? GetApiKey()
        {
            return Environment.GetEnvironmentVariable(ApiKeyEnvironmentVariable)
                ?? _configuration[$"Recommendation:{ConfigurationSectionName}:ApiKey"];
        }

        protected string? GetModel()
        {
            return Environment.GetEnvironmentVariable(ModelEnvironmentVariable)
                ?? _configuration[$"Recommendation:{ConfigurationSectionName}:Model"];
        }

        private string BuildPrompt(RecommendationContext context)
        {
            var candidates = context.Candidates.Select(candidate => new
            {
                candidate.Id,
                candidate.Title,
                candidate.Publisher,
                candidate.Format,
                candidate.Demographic,
                candidate.Score,
                candidate.Reason
            });

            return JsonSerializer.Serialize(new
            {
                inferredCountry = context.InferredCountry,
                rules = new[]
                {
                    "Do not introduce new ids.",
                    "Prefer the strongest thematic and demographic matches.",
                    "Keep local-publisher preference intact."
                },
                candidates
            });
        }

        private IReadOnlyList<string> ParseOrderedIds(string payload)
        {
            var content = TryExtractMessageContent(payload) ?? payload;
            content = content.Trim();

            if (content.StartsWith("```", StringComparison.Ordinal))
            {
                content = content.Replace("```json", string.Empty, StringComparison.OrdinalIgnoreCase)
                    .Replace("```", string.Empty, StringComparison.OrdinalIgnoreCase)
                    .Trim();
            }

            using var document = JsonDocument.Parse(content);
            var root = document.RootElement;

            if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("orderedIds", out var orderedIdsElement))
            {
                return orderedIdsElement.EnumerateArray().Select(item => item.GetString() ?? string.Empty).Where(item => !string.IsNullOrWhiteSpace(item)).ToList();
            }

            if (root.ValueKind == JsonValueKind.Array)
            {
                return root.EnumerateArray().Select(item => item.GetString() ?? string.Empty).Where(item => !string.IsNullOrWhiteSpace(item)).ToList();
            }

            throw new InvalidOperationException($"Provider '{Name}' returned an unsupported payload.");
        }

        private static string? TryExtractMessageContent(string payload)
        {
            try
            {
                using var document = JsonDocument.Parse(payload);
                if (document.RootElement.TryGetProperty("choices", out var choicesElement) && choicesElement.ValueKind == JsonValueKind.Array)
                {
                    var firstChoice = choicesElement.EnumerateArray().FirstOrDefault();
                    if (firstChoice.ValueKind == JsonValueKind.Object &&
                        firstChoice.TryGetProperty("message", out var messageElement) &&
                        messageElement.TryGetProperty("content", out var contentElement))
                    {
                        return contentElement.GetString();
                    }
                }
            }
            catch (JsonException)
            {
                return null;
            }

            return null;
        }

        private IReadOnlyList<RecommendationCandidate> ApplyOrder(IReadOnlyList<RecommendationCandidate> originalCandidates, IReadOnlyList<string> orderedIds)
        {
            var lookup = originalCandidates.ToDictionary(candidate => candidate.Id, candidate => candidate, StringComparer.OrdinalIgnoreCase);
            var reranked = new List<RecommendationCandidate>();

            foreach (var id in orderedIds)
            {
                if (lookup.Remove(id, out var candidate))
                {
                    reranked.Add(candidate);
                }
            }

            if (lookup.Count > 0)
            {
                _logger.LogInformation("Provider {ProviderName} returned a partial ranking. Appending {RemainingCount} remaining candidates.", Name, lookup.Count);
                reranked.AddRange(originalCandidates.Where(candidate => lookup.ContainsKey(candidate.Id)));
            }

            return reranked;
        }
    }
}