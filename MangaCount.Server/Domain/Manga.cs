namespace MangaCount.Server.Domain
{
    public class Manga
    {
        public virtual int Id { get; set; }
        public virtual required string Name { get; set; }
        public virtual int? Volumes { get; set; }

        public virtual int FormatId { get; set; }
        public virtual Format Format { get; set; }

        public virtual int PublisherId { get; set; }
        public virtual Publisher Publisher { get; set; }
    }
}
