namespace MangaCount.Server.DTO
{
    public class MangaDTO
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public int? Volumes { get; set; }
        public int FormatId { get; set; }
        public int PublisherId { get; set; }
    }
}
