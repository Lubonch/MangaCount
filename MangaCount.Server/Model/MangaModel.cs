namespace MangaCount.Server.Model
{
    public class MangaModel
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public int? Volumes { get; set; }
        public int FormatId { get; set; }
        public int PublisherId { get; set; }
    }
}
