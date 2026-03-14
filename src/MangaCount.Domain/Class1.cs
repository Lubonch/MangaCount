namespace MangaCount.Domain.Entities;

public class Profile
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    
    // Navigation property
    public virtual ICollection<Manga> MangaCollection { get; set; } = new List<Manga>();
}
