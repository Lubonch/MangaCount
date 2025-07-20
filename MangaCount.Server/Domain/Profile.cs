namespace MangaCount.Server.Domain
{
    public class Profile
    {
        public virtual int Id { get; set; }
        public required string Name { get; set; }
        public string? ProfilePicture { get; set; }
        public virtual DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public virtual bool IsActive { get; set; } = true;
    }
}