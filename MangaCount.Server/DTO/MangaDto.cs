namespace MangaCount.Server.DTO
{
    public class MangaDto
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public int? Volumes { get; set; }
        public int FormatId { get; set; }
        public string? FormatName { get; set; }
        public int PublisherId { get; set; }
        public string? PublisherName { get; set; }
    }

    public class MangaCreateDto
    {
        public int? Id { get; set; }
        public required string Name { get; set; }
        public int? Volumes { get; set; }
        public int FormatId { get; set; }
        public int PublisherId { get; set; }
    }
}