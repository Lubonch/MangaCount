using MangaCount.Server.Domain;

namespace MangaCount.Server.Infrastructure.Repositories
{
    public interface IFormatRepository
    {
        Format? GetById(int id);
        IEnumerable<Format> GetAll();
        Format Save(Format format);
        void Delete(Format format);
    }
}