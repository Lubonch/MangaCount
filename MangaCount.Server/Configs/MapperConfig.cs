using AutoMapper;
using MangaCount.Server.Domain;
using MangaCount.Server.DTO;
using MangaCount.Server.Model;
using Microsoft.Extensions.DependencyInjection;

namespace MangaCount.Server.Configs
{
    public class MapperConfig
    {
        public static Mapper InitializeAutomapper()
        {
            //Provide all the Mapping Configuration
            var config = new MapperConfiguration(cfg =>
            {
                //Configuring Model to DTO
                cfg.CreateMap<EntryModel, EntryDTO>();
                cfg.CreateMap<MangaModel, MangaDTO>();
                cfg.CreateMap<ProfileModel, ProfileDTO>();

                //Configuring DTO to Model
                cfg.CreateMap<EntryDTO, EntryModel>();
                cfg.CreateMap<MangaDTO, MangaModel>();
                cfg.CreateMap<ProfileDTO, ProfileModel>();

                //Configuring DTO to Domain
                cfg.CreateMap<EntryDTO, Entry>();
                cfg.CreateMap<MangaDTO, Manga>();
                cfg.CreateMap<ProfileDTO, Domain.Profile>();

                //Configuring Domain to DTO
                cfg.CreateMap<Entry, EntryDTO>();
                cfg.CreateMap<Manga, MangaDTO>();
                cfg.CreateMap<Domain.Profile, ProfileDTO>();

                //Coinfiguring Domain to Model
                cfg.CreateMap<Entry, EntryModel>();
                cfg.CreateMap<Manga, MangaModel>();
                cfg.CreateMap<Domain.Profile, ProfileModel>();

                //configuring Model to Domain
                cfg.CreateMap<EntryModel, Entry>();
                cfg.CreateMap<MangaModel, Manga>();
                cfg.CreateMap<ProfileModel, Domain.Profile>();

                // New Format and Publisher mappings
                cfg.CreateMap<Format, FormatDTO>();
                cfg.CreateMap<FormatDTO, Format>();
                cfg.CreateMap<Publisher, PublisherDTO>();
                cfg.CreateMap<PublisherDTO, Publisher>();

            }, new LoggerFactory());
            //Create an Instance of Mapper and return that Instance
            var mapper = new Mapper(config);
            return mapper;
        }
    }
}
