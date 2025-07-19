using MangaCount.Server.Model;
using System.Net;

namespace MangaCount.Server.Services.Contracts
{
    public interface IProfileService
    {
        List<ProfileModel> GetAllProfiles();
        ProfileModel GetProfileById(int id);
        HttpResponseMessage SaveOrUpdate(DTO.ProfileDTO profileDTO);
        void DeleteProfile(int id);
    }
}