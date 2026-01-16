using AutoMapper;
using MangaCount.Server.Domain;
using MangaCount.Server.DTO;
using DomainProfile = MangaCount.Server.Domain.Profile;
using AutoMapperProfile = AutoMapper.Profile;

namespace MangaCount.Server.Configs
{
    public class MappingProfile : AutoMapperProfile
    {
        public MappingProfile()
        {
            // Manga mappings
            CreateMap<Manga, MangaDto>()
                .ForMember(dest => dest.FormatName, opt => opt.MapFrom(src => src.Format != null ? src.Format.Name : null))
                .ForMember(dest => dest.PublisherName, opt => opt.MapFrom(src => src.Publisher != null ? src.Publisher.Name : null));
            
            CreateMap<MangaCreateDto, Manga>()
                .ForMember(dest => dest.Format, opt => opt.Ignore())
                .ForMember(dest => dest.Publisher, opt => opt.Ignore());

            // Entry mappings
            CreateMap<Entry, EntryDto>()
                .ForMember(dest => dest.Manga, opt => opt.MapFrom(src => src.Manga));
            
            CreateMap<EntryCreateDto, Entry>()
                .ForMember(dest => dest.Manga, opt => opt.Ignore())
                .ForMember(dest => dest.Profile, opt => opt.Ignore());

            // Profile mappings
            CreateMap<DomainProfile, ProfileDto>();
            CreateMap<ProfileCreateDto, DomainProfile>()
                .ForMember(dest => dest.CreatedDate, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.Ignore());

            // Format and Publisher mappings
            CreateMap<Format, Format>();
            CreateMap<Publisher, Publisher>();
        }
    }
}