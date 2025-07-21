using AutoMapper;
using MangaCount.Server.Configs;
using MangaCount.Server.Domain;
using MangaCount.Server.Model;
using MangaCount.Server.Repositories.Contracts;
using MangaCount.Server.Services.Contracts;
using System.Net;

namespace MangaCount.Server.Services
{
    public class ProfileService : IProfileService
    {
        private readonly IProfileRepository _profileRepository;
        private readonly Mapper _mapper;
        private readonly ILogger<ProfileService> _logger;

        public ProfileService(IProfileRepository profileRepository, ILogger<ProfileService> logger)
        {
            _profileRepository = profileRepository;
            _mapper = MapperConfig.InitializeAutomapper();
            _logger = logger;
        }

        public List<ProfileModel> GetAllProfiles()
        {
            var profiles = _profileRepository.GetAllProfiles();
            return _mapper.Map<List<ProfileModel>>(profiles);
        }

        public ProfileModel GetProfileById(int id)
        {
            var profile = _profileRepository.GetById(id);
            return _mapper.Map<ProfileModel>(profile);
        }

        public HttpResponseMessage SaveOrUpdate(DTO.ProfileDTO profileDTO)
        {
            _logger.LogInformation("SaveOrUpdate called with ProfileDTO: Id={Id}, Name={Name}", profileDTO.Id, profileDTO.Name);
            
            Domain.Profile profile = _mapper.Map<Domain.Profile>(profileDTO);
            _logger.LogInformation("After mapping to Domain.Profile: Id={Id}, Name={Name}", profile.Id, profile.Name);
            
            Domain.Profile queryResult;

            // Check if profile exists in database by checking if ID > 0 and if it actually exists
            var existingProfile = profileDTO.Id > 0 ? _profileRepository.GetById(profileDTO.Id) : null;
            _logger.LogInformation("Existing profile check: profileDTO.Id={Id}, existingProfile={Exists}", 
                profileDTO.Id, existingProfile != null ? "EXISTS" : "NULL");
            
            if (existingProfile == null)
            {
                _logger.LogInformation("Creating new profile - setting Id to 0");
                // Force ID to 0 for new profiles to let database auto-increment
                profile.Id = 0;
                profile.CreatedDate = DateTime.UtcNow;
                profile.IsActive = true;
                
                _logger.LogInformation("Before Create call: Id={Id}, Name={Name}, CreatedDate={CreatedDate}", 
                    profile.Id, profile.Name, profile.CreatedDate);
                
                queryResult = _profileRepository.Create(profile);
            }
            else
            {
                _logger.LogInformation("Updating existing profile with Id={Id}", profile.Id);
                // Update existing profile
                queryResult = _profileRepository.Update(profile);
            }

            return queryResult != null ? 
                new HttpResponseMessage(HttpStatusCode.OK) : 
                new HttpResponseMessage(HttpStatusCode.BadRequest);
        }

        public void DeleteProfile(int id)
        {
            _profileRepository.Delete(id);
        }
    }
}