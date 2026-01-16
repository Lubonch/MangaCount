namespace MangaCount.Server.DTO
{
    public class EntryDto
    {
        public int Id { get; set; }
        public int MangaId { get; set; }
        public MangaDto? Manga { get; set; }
        public int ProfileId { get; set; }
        public int Quantity { get; set; }
        public string? Pending { get; set; }
        public bool Priority { get; set; }
    }

    public class EntryCreateDto
    {
        public int? Id { get; set; }
        public int MangaId { get; set; }
        public int ProfileId { get; set; }
        public int Quantity { get; set; }
        public string? Pending { get; set; }
        public bool Priority { get; set; }
    }
}