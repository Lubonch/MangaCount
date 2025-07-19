using MangaCount.Server.Domain;

namespace MangaCount.Server.Repositories.Contracts
{
    public interface IProfileRepository
    {
        Profile Create(Profile profile);
        Profile Update(Profile profile);
        Profile GetById(int id);
        IEnumerable<Profile> GetAllProfiles();
        void Delete(int id);
    }
}