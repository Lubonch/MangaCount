namespace MangaCount.Domain
{
    public class Manga
    {
        public virtual int Id { get; set; }
        public virtual required string Name { get; set; }
        public virtual int? Volumes { get; set; }

    }
}
