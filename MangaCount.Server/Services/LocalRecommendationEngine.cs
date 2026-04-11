using System.Text.Json;
using System.Text.RegularExpressions;
using MangaCount.Server.Model;
using MangaCount.Server.Services.Contracts;

namespace MangaCount.Server.Services
{
    public class LocalRecommendationEngine : ILocalRecommendationEngine
    {
        private const string RecommendationDirectory = "recommendations";
        private static readonly Regex ParentheticalTextRegex = new(@"\([^)]*\)", RegexOptions.Compiled);
        private static readonly Regex EditionTokenRegex = new(@"\b(kanzenban|deluxe|perfect edition|perfect|edition|edicion|volumen|volumes|volume|part|parte)\b", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        private static readonly Regex NonAlphaNumericRegex = new(@"[^a-z0-9\s]", RegexOptions.Compiled);
        private static readonly Regex MultiWhitespaceRegex = new(@"\s+", RegexOptions.Compiled);
        private readonly ILogger<LocalRecommendationEngine> _logger;
        private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

        public LocalRecommendationEngine(ILogger<LocalRecommendationEngine> logger)
        {
            _logger = logger;
        }

        public async Task<RecommendationResponse> GenerateRecommendationsAsync(List<EntryModel> entries, int limit, CancellationToken ct = default)
        {
            var catalog = await LoadCatalogAsync(ct);
            var publisherCountries = await LoadPublisherCountriesAsync(ct);
            var inference = InferUserCountry(entries, publisherCountries);
            var profile = BuildTasteProfile(entries, catalog);

            if (string.IsNullOrWhiteSpace(inference.Country) || !inference.IsConfident)
            {
                return new RecommendationResponse
                {
                    Provider = "local",
                    InferredCountry = null,
                    IsConfident = false,
                    AvailableCount = 0,
                    BlockedByImportCount = 0,
                    Limit = limit,
                    Inference = inference
                };
            }

            var blockedByImportCount = 0;
            var rankedCandidates = new List<RecommendationCandidate>();

            foreach (var candidate in catalog)
            {
                var normalizedTitle = NormalizeTitle(candidate.Title);

                if (profile.OwnedTitles.Contains(normalizedTitle))
                {
                    continue;
                }

                if (!string.Equals(candidate.PublisherCountry, inference.Country, StringComparison.OrdinalIgnoreCase))
                {
                    blockedByImportCount += 1;
                    continue;
                }

                var scoredCandidate = ScoreCandidate(candidate, profile);
                rankedCandidates.Add(scoredCandidate);
            }

            var items = rankedCandidates
                .OrderByDescending(item => item.Score)
                .ThenBy(item => item.Title)
                .Take(limit)
                .ToList();

            return new RecommendationResponse
            {
                Provider = "local",
                InferredCountry = inference.Country,
                IsConfident = inference.IsConfident,
                AvailableCount = items.Count,
                BlockedByImportCount = blockedByImportCount,
                Limit = limit,
                Items = items,
                Inference = inference
            };
        }

        private async Task<List<RecommendationCatalogItem>> LoadCatalogAsync(CancellationToken ct)
        {
            var path = ResolveRecommendationPath("catalog.json");
            var content = await File.ReadAllTextAsync(path, ct);
            return JsonSerializer.Deserialize<List<RecommendationCatalogItem>>(content, _jsonOptions) ?? new List<RecommendationCatalogItem>();
        }

        private async Task<Dictionary<string, string?>> LoadPublisherCountriesAsync(CancellationToken ct)
        {
            var path = ResolveRecommendationPath("publisher-countries.json");
            var content = await File.ReadAllTextAsync(path, ct);
            return JsonSerializer.Deserialize<Dictionary<string, string?>>(content, _jsonOptions) ?? new Dictionary<string, string?>();
        }

        private string ResolveRecommendationPath(string fileName)
        {
            var outputPath = Path.Combine(AppContext.BaseDirectory, RecommendationDirectory, fileName);
            if (File.Exists(outputPath))
            {
                return outputPath;
            }

            var repositoryPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "shared", "recommendations", fileName));
            if (File.Exists(repositoryPath))
            {
                return repositoryPath;
            }

            throw new FileNotFoundException($"Recommendation data file '{fileName}' was not found.");
        }

        private RecommendationInference InferUserCountry(IEnumerable<EntryModel> entries, IReadOnlyDictionary<string, string?> publisherCountries)
        {
            var totals = new Dictionary<string, RecommendationCountryAccumulator>(StringComparer.OrdinalIgnoreCase);

            foreach (var entry in entries)
            {
                var ownedVolumes = GetOwnedVolumes(entry);
                var publisherKey = NormalizePublisher(entry.Manga?.Publisher?.Name);

                if (ownedVolumes <= 0 || string.IsNullOrWhiteSpace(publisherKey) || !publisherCountries.TryGetValue(publisherKey, out var country) || string.IsNullOrWhiteSpace(country))
                {
                    continue;
                }

                if (!totals.TryGetValue(country, out var accumulator))
                {
                    accumulator = new RecommendationCountryAccumulator(country);
                    totals[country] = accumulator;
                }

                accumulator.VolumeCount += ownedVolumes;
                accumulator.SeriesCount += 1;
                accumulator.Publishers.Add(publisherKey);
            }

            var breakdown = totals.Values
                .Select(item => new RecommendationCountryBreakdown
                {
                    Country = item.Country,
                    VolumeCount = item.VolumeCount,
                    SeriesCount = item.SeriesCount,
                    Publishers = item.Publishers.OrderBy(publisher => publisher).ToList()
                })
                .OrderByDescending(item => item.VolumeCount)
                .ThenByDescending(item => item.SeriesCount)
                .ThenBy(item => item.Country)
                .ToList();

            var leader = breakdown.FirstOrDefault();
            var runnerUp = breakdown.Skip(1).FirstOrDefault();

            if (leader == null)
            {
                return new RecommendationInference { Country = null, IsConfident = false, Breakdown = breakdown };
            }

            var tiedOnVolumes = runnerUp != null && runnerUp.VolumeCount == leader.VolumeCount;
            var tiedOnSeries = runnerUp != null && runnerUp.SeriesCount == leader.SeriesCount;

            if (tiedOnVolumes && tiedOnSeries)
            {
                return new RecommendationInference { Country = null, IsConfident = false, Breakdown = breakdown };
            }

            return new RecommendationInference { Country = leader.Country, IsConfident = leader.VolumeCount > 0, Breakdown = breakdown };
        }

        private RecommendationTasteProfile BuildTasteProfile(IEnumerable<EntryModel> entries, IReadOnlyList<RecommendationCatalogItem> catalog)
        {
            var tokenWeights = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
            var localPublisherWeights = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
            var formatWeights = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
            var demographicWeights = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
            var catalogIndex = catalog.ToDictionary(item => NormalizeTitle(item.Title), item => item, StringComparer.OrdinalIgnoreCase);
            var ownedTitles = new HashSet<string>(entries.Where(entry => GetOwnedVolumes(entry) > 0).Select(entry => NormalizeTitle(entry.Manga?.Name)), StringComparer.OrdinalIgnoreCase);

            foreach (var entry in entries)
            {
                var quantity = GetOwnedVolumes(entry);
                if (quantity <= 0)
                {
                    continue;
                }

                var title = entry.Manga?.Name ?? string.Empty;
                var publisherKey = NormalizePublisher(entry.Manga?.Publisher?.Name);
                var formatKey = NormalizeText(entry.Manga?.Format?.Name);

                AddTokens(tokenWeights, title, 0.9 * quantity);
                AddWeight(localPublisherWeights, publisherKey, quantity);
                AddWeight(formatWeights, formatKey, quantity);

                if (!string.IsNullOrWhiteSpace(publisherKey))
                {
                    AddTokens(tokenWeights, publisherKey, 0.5 * quantity);
                }

                if (!string.IsNullOrWhiteSpace(formatKey))
                {
                    AddTokens(tokenWeights, formatKey, 0.5 * quantity);
                }

                if (!catalogIndex.TryGetValue(NormalizeTitle(title), out var catalogMatch))
                {
                    continue;
                }

                AddTokens(tokenWeights, catalogMatch.Genres, 2.4 * quantity);
                AddTokens(tokenWeights, catalogMatch.Themes, 2.1 * quantity);
                AddTokens(tokenWeights, catalogMatch.Summary, 0.9 * quantity);
                AddTokens(tokenWeights, catalogMatch.Demographic, 1.3 * quantity);
                AddWeight(demographicWeights, NormalizeText(catalogMatch.Demographic), quantity);
            }

            return new RecommendationTasteProfile(tokenWeights, localPublisherWeights, formatWeights, demographicWeights, ownedTitles);
        }

        private RecommendationCandidate ScoreCandidate(RecommendationCatalogItem candidate, RecommendationTasteProfile profile)
        {
            var candidateTokenWeights = BuildCandidateTokenWeights(candidate);
            var similarity = CosineSimilarity(profile.TokenWeights, candidateTokenWeights);
            var publisherBoost = profile.LocalPublisherWeights.TryGetValue(NormalizePublisher(candidate.Publisher), out var publisherWeight) ? publisherWeight * 0.02 : 0;
            var formatBoost = profile.FormatWeights.TryGetValue(NormalizeText(candidate.Format), out var formatWeight) ? formatWeight * 0.015 : 0;
            var demographicBoost = profile.DemographicWeights.TryGetValue(NormalizeText(candidate.Demographic), out var demographicWeight) ? demographicWeight * 0.02 : 0;
            var score = similarity + publisherBoost + formatBoost + demographicBoost;
            var reasons = GetTopMatchingTokens(profile.TokenWeights, candidateTokenWeights)
                .Select(token => char.ToUpperInvariant(token[0]) + token[1..])
                .ToList();

            return new RecommendationCandidate
            {
                Id = candidate.Id,
                Title = candidate.Title,
                Publisher = candidate.Publisher,
                PublisherCountry = candidate.PublisherCountry,
                Format = candidate.Format,
                Demographic = candidate.Demographic,
                Volumes = candidate.Volumes,
                Score = Math.Round(score, 4),
                Reason = reasons.Count > 0
                    ? $"Matches your collection through {string.Join(", ", reasons)}"
                    : "Matches your local collection profile"
            };
        }

        private Dictionary<string, double> BuildCandidateTokenWeights(RecommendationCatalogItem candidate)
        {
            var tokenWeights = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
            AddTokens(tokenWeights, candidate.Title, 2.5);
            AddTokens(tokenWeights, candidate.Publisher, 1.1);
            AddTokens(tokenWeights, candidate.Format, 1.2);
            AddTokens(tokenWeights, candidate.Demographic, 1.8);
            AddTokens(tokenWeights, candidate.Genres, 2.4);
            AddTokens(tokenWeights, candidate.Themes, 2.1);
            AddTokens(tokenWeights, candidate.Summary, 1);
            return tokenWeights;
        }

        private static double CosineSimilarity(IReadOnlyDictionary<string, double> leftWeights, IReadOnlyDictionary<string, double> rightWeights)
        {
            if (leftWeights.Count == 0 || rightWeights.Count == 0)
            {
                return 0;
            }

            var dotProduct = 0d;
            var leftMagnitude = 0d;
            var rightMagnitude = 0d;

            foreach (var weight in leftWeights.Values)
            {
                leftMagnitude += weight * weight;
            }

            foreach (var pair in rightWeights)
            {
                rightMagnitude += pair.Value * pair.Value;
                if (leftWeights.TryGetValue(pair.Key, out var leftWeight))
                {
                    dotProduct += leftWeight * pair.Value;
                }
            }

            if (leftMagnitude == 0 || rightMagnitude == 0)
            {
                return 0;
            }

            return dotProduct / (Math.Sqrt(leftMagnitude) * Math.Sqrt(rightMagnitude));
        }

        private static IEnumerable<string> GetTopMatchingTokens(IReadOnlyDictionary<string, double> profileWeights, IReadOnlyDictionary<string, double> candidateWeights)
        {
            return candidateWeights.Keys
                .Where(token => profileWeights.ContainsKey(token))
                .OrderByDescending(token => profileWeights[token] * candidateWeights[token])
                .Take(3);
        }

        private static void AddWeight(IDictionary<string, double> target, string? key, double weight)
        {
            if (string.IsNullOrWhiteSpace(key) || weight == 0)
            {
                return;
            }

            target[key] = target.TryGetValue(key, out var currentWeight) ? currentWeight + weight : weight;
        }

        private static void AddTokens(IDictionary<string, double> target, string? value, double weight)
        {
            foreach (var token in Tokenize(value))
            {
                AddWeight(target, token, weight);
            }
        }

        private static void AddTokens(IDictionary<string, double> target, IEnumerable<string>? values, double weight)
        {
            if (values == null)
            {
                return;
            }

            foreach (var value in values)
            {
                AddTokens(target, value, weight);
            }
        }

        private static IEnumerable<string> Tokenize(string? value)
        {
            return NormalizeText(value)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(token => token.Length > 1);
        }

        private static string NormalizeTitle(string? value)
        {
            return NormalizeText(value);
        }

        private static string NormalizePublisher(string? value)
        {
            return NormalizeText(value);
        }

        private static string NormalizeText(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var normalized = value.Normalize(System.Text.NormalizationForm.FormD);
            var withoutDiacritics = new string(normalized
                .Where(character => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(character) != System.Globalization.UnicodeCategory.NonSpacingMark)
                .ToArray())
                .ToLowerInvariant();
            var withoutParentheticalText = ParentheticalTextRegex.Replace(withoutDiacritics, " ");
            var withoutEditionTokens = EditionTokenRegex.Replace(withoutParentheticalText, " ");
            var alphaNumericText = NonAlphaNumericRegex.Replace(withoutEditionTokens, " ");

            return MultiWhitespaceRegex.Replace(alphaNumericText, " ").Trim();
        }

        private static int GetOwnedVolumes(EntryModel entry)
        {
            return Math.Max(entry.Quantity, 0);
        }

        private sealed class RecommendationCatalogItem
        {
            public string Id { get; set; } = string.Empty;
            public string Title { get; set; } = string.Empty;
            public string Publisher { get; set; } = string.Empty;
            public string PublisherCountry { get; set; } = string.Empty;
            public string? Format { get; set; }
            public string? Demographic { get; set; }
            public List<string> Genres { get; set; } = new();
            public List<string> Themes { get; set; } = new();
            public int? Volumes { get; set; }
            public string Summary { get; set; } = string.Empty;
        }

        private sealed class RecommendationCountryAccumulator
        {
            public RecommendationCountryAccumulator(string country)
            {
                Country = country;
            }

            public string Country { get; }
            public int VolumeCount { get; set; }
            public int SeriesCount { get; set; }
            public HashSet<string> Publishers { get; } = new(StringComparer.OrdinalIgnoreCase);
        }

        private sealed record RecommendationTasteProfile(
            Dictionary<string, double> TokenWeights,
            Dictionary<string, double> LocalPublisherWeights,
            Dictionary<string, double> FormatWeights,
            Dictionary<string, double> DemographicWeights,
            HashSet<string> OwnedTitles);
    }
}