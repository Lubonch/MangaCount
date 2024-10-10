using MangaCountServer.Domain;

namespace MangaCountServer.Model
{
    public class EntryModel
    {
        public int Id { get; set; }
        public required Manga Manga { get; set; }
        public int Quantity { get; set; }
        public string? Pending { get; set; }
        public bool Priority { get; set; }
    }
}
