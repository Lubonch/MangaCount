using MangaCount.Server.Domain;

namespace MangaCount.Server.Model
{
    public class EntryModel
    {
        public int Id { get; set; }
        public required Manga Manga { get; set; }
        public required int MangaId { get; set; }
        public required int ProfileId { get; set; } // NEW
        public int Quantity { get; set; }
        public string? Pending { get; set; }
        public bool Priority { get; set; }
    }
}
