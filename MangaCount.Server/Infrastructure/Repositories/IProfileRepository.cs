using MangaCount.Server.Domain;

namespace MangaCount.Server.Infrastructure.Repositories
{
    public interface IProfileRepository
    {
        Profile? GetById(int id);
        IEnumerable<Profile> GetAll();
        Profile Save(Profile profile);
        void Delete(Profile profile);
    }
}