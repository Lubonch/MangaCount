namespace MangaCount.Server.Model
{
    public class ProfileModel
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public string? ProfilePicture { get; set; }
        public DateTime CreatedDate { get; set; }
        public bool IsActive { get; set; }
    }
}