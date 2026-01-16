using MangaCount.Server.DTO;

namespace MangaCount.Server.Application
{
    public interface IProfileService
    {
        Task<IEnumerable<ProfileDto>> GetAllProfilesAsync();
        Task<ProfileDto?> GetProfileByIdAsync(int id);
        Task<ProfileDto> SaveProfileAsync(ProfileCreateDto profileDto);
        Task DeleteProfileAsync(int id);
        Task<string?> SaveProfilePictureAsync(int profileId, IFormFile file);
    }
}