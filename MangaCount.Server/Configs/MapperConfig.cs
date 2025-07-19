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

                //Configuring DTO to Model
                cfg.CreateMap<EntryDTO, EntryModel>();
                cfg.CreateMap<MangaDTO, MangaModel>();

                //Configuring DTO to Domain
                cfg.CreateMap<EntryDTO, Entry>();
                cfg.CreateMap<MangaDTO, Manga>();

                //Configuring Domain to DTO
                cfg.CreateMap<Entry, EntryDTO>();
                cfg.CreateMap<Manga, MangaDTO>();

                //Coinfiguring Domain to Model
                cfg.CreateMap<Entry, EntryModel>();
                cfg.CreateMap<Manga, MangaModel>();

                //configuring Model to Domain
                cfg.CreateMap<EntryModel, Entry>();
                cfg.CreateMap<MangaModel, Manga>();
            }, new LoggerFactory());
            //Create an Instance of Mapper and return that Instance
            var mapper = new Mapper(config);
            return mapper;
        }
    }
}
