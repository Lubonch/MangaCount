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

        public ProfileService(IProfileRepository profileRepository)
        {
            _profileRepository = profileRepository;
            _mapper = MapperConfig.InitializeAutomapper();
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
            Domain.Profile profile = _mapper.Map<Domain.Profile>(profileDTO);
            Domain.Profile queryResult;

            if (profile.Id == 0)
            {
                queryResult = _profileRepository.Create(profile);
            }
            else
            {
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