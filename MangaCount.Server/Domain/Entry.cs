namespace MangaCountServer.Domain
{
    public class Entry
    {
        public virtual int Id { get; set; }
        public virtual required Manga Manga { get; set; }
        public virtual int Quantity { get; set; }
        public virtual string? Pending { get; set; }
        public virtual bool Priority { get; set; }
    }
}
