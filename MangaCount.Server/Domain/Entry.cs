namespace MangaCount.Server.Domain
{
    public class Entry
    {
        public virtual int Id { get; set; }
        public virtual required int MangaId { get; set; }
        public virtual Manga? Manga { get; set; }
        public virtual required int ProfileId { get; set; }
        public virtual Profile? Profile { get; set; }
        public virtual int Quantity { get; set; }
        public virtual string? Pending { get; set; }
        public virtual bool Priority { get; set; }
    }
}