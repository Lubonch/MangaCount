using MangaCount.Server.Domain;

namespace MangaCount.Server.Repositories.Contracts
{
    public interface IFormatRepository
    {
        IEnumerable<Format> GetAll();
        Format GetById(int id);
        Format Create(Format format);
        Format Update(Format format);
        void Delete(int id);
    }
}