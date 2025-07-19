namespace MangaCount.Server.DTO
{
    public class MangaDTO
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public int? Volumes { get; set; }
    }
}
