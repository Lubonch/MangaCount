namespace MangaCount.Server.DTO
{
    public class ProfileDto
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public string? ProfilePicture { get; set; }
        public DateTime CreatedDate { get; set; }
        public bool IsActive { get; set; }
    }

    public class ProfileCreateDto
    {
        public int? Id { get; set; }
        public required string Name { get; set; }
        public string? ProfilePicture { get; set; }
    }
}