namespace MangaCount.Domain.Entities;

public class Manga
{
    public int Id { get; set; }
    public int ProfileId { get; set; }
    public required string Title { get; set; }
    public int Purchased { get; set; }
    public string Total { get; set; } = string.Empty; // Can be "??" or number
    public string Pending { get; set; } = string.Empty; // Non-consecutive volumes
    public bool Complete { get; set; }
    public bool Priority { get; set; }
    public string Format { get; set; } = "Unknown";
    public string Publisher { get; set; } = "Unknown";
    public string? ImageUrl { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate { get; set; }
    
    // Navigation property
    public virtual Profile Profile { get; set; } = null!;
    
    // Computed properties
    public int? TotalAsNumber => int.TryParse(Total, out var result) ? result : null;
    public bool IsIncomplete => !Complete || (TotalAsNumber.HasValue && Purchased < TotalAsNumber.Value);
    public int RemainingVolumes => TotalAsNumber.HasValue ? Math.Max(0, TotalAsNumber.Value - Purchased) : 0;
}