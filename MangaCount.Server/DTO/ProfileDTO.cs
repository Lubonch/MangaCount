using MangaCount.Server.Domain;

namespace MangaCount.Server.DTO
{
    public class ProfileDTO
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public string? ProfilePicture { get; set; }
        public DateTime CreatedDate { get; set; }
        public bool IsActive { get; set; }
    }
}