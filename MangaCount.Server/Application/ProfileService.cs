using AutoMapper;
using MangaCount.Server.Domain;
using MangaCount.Server.DTO;
using MangaCount.Server.Infrastructure.Repositories;
using DomainProfile = MangaCount.Server.Domain.Profile;

namespace MangaCount.Server.Application
{
    public class ProfileService : IProfileService
    {
        private readonly IProfileRepository _profileRepository;
        private readonly IMapper _mapper;
        private readonly IWebHostEnvironment _webHostEnvironment;

        public ProfileService(
            IProfileRepository profileRepository, 
            IMapper mapper,
            IWebHostEnvironment webHostEnvironment)
        {
            _profileRepository = profileRepository;
            _mapper = mapper;
            _webHostEnvironment = webHostEnvironment;
        }

        public async Task<IEnumerable<ProfileDto>> GetAllProfilesAsync()
        {
            return await Task.Run(() =>
            {
                var profiles = _profileRepository.GetAll();
                return _mapper.Map<IEnumerable<ProfileDto>>(profiles);
            });
        }

        public async Task<ProfileDto?> GetProfileByIdAsync(int id)
        {
            return await Task.Run(() =>
            {
                var profile = _profileRepository.GetById(id);
                return profile != null ? _mapper.Map<ProfileDto>(profile) : null;
            });
        }

        public async Task<ProfileDto> SaveProfileAsync(ProfileCreateDto profileDto)
        {
            return await Task.Run(() =>
            {
                var profile = _mapper.Map<DomainProfile>(profileDto);
                if (profile.Id == 0)
                {
                    profile.CreatedDate = DateTime.UtcNow;
                }
                var savedProfile = _profileRepository.Save(profile);
                return _mapper.Map<ProfileDto>(savedProfile);
            });
        }

        public async Task DeleteProfileAsync(int id)
        {
            await Task.Run(() =>
            {
                var profile = _profileRepository.GetById(id);
                if (profile != null)
                {
                    _profileRepository.Delete(profile);
                }
            });
        }

        public async Task<string?> SaveProfilePictureAsync(int profileId, IFormFile file)
        {
            return await Task.Run(async () =>
            {
                if (file == null || file.Length == 0)
                    return null;

                // Create profiles directory if it doesn't exist
                var profilesPath = Path.Combine(_webHostEnvironment.WebRootPath, "profiles");
                if (!Directory.Exists(profilesPath))
                {
                    Directory.CreateDirectory(profilesPath);
                }

                // Generate unique filename
                var fileExtension = Path.GetExtension(file.FileName);
                var fileName = $"profile_{profileId}_{Guid.NewGuid()}{fileExtension}";
                var filePath = Path.Combine(profilesPath, fileName);

                // Save file
                using var stream = new FileStream(filePath, FileMode.Create);
                await file.CopyToAsync(stream);

                // Update profile with new picture path
                var profile = _profileRepository.GetById(profileId);
                if (profile != null)
                {
                    profile.ProfilePicture = $"/profiles/{fileName}";
                    _profileRepository.Save(profile);
                    return profile.ProfilePicture;
                }

                return null;
            });
        }
    }
}