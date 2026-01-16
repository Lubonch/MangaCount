namespace MangaCount.Server.Domain
{
    public class Profile
    {
        public virtual int Id { get; set; }
        public virtual required string Name { get; set; }
        public virtual string? ProfilePicture { get; set; }
        public virtual DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public virtual bool IsActive { get; set; } = true;
    }
}