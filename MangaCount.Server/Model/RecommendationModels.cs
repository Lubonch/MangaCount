namespace MangaCount.Server.Model
{
    public class RecommendationCandidate
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Publisher { get; set; } = string.Empty;
        public string PublisherCountry { get; set; } = string.Empty;
        public string? Format { get; set; }
        public string? Demographic { get; set; }
        public int? Volumes { get; set; }
        public double Score { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class RecommendationCountryBreakdown
    {
        public string Country { get; set; } = string.Empty;
        public int VolumeCount { get; set; }
        public int SeriesCount { get; set; }
        public List<string> Publishers { get; set; } = new();
    }

    public class RecommendationInference
    {
        public string? Country { get; set; }
        public bool IsConfident { get; set; }
        public List<RecommendationCountryBreakdown> Breakdown { get; set; } = new();
    }

    public class RecommendationResponse
    {
        public string Provider { get; set; } = "local";
        public string? InferredCountry { get; set; }
        public bool IsConfident { get; set; }
        public int AvailableCount { get; set; }
        public int BlockedByImportCount { get; set; }
        public int Limit { get; set; }
        public List<RecommendationCandidate> Items { get; set; } = new();
        public RecommendationInference Inference { get; set; } = new();
    }

    public class RecommendationContext
    {
        public required List<EntryModel> Entries { get; set; }
        public required RecommendationResponse BaseResponse { get; set; }
        public required IReadOnlyList<RecommendationCandidate> Candidates { get; set; }
        public string? InferredCountry { get; set; }
    }
}