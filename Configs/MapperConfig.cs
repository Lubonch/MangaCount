using AutoMapper;
using MangaCount.Domain;
using MangaCount.DTO;
using MangaCount.Model;

namespace MangaCount.Configs
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
            });
            //Create an Instance of Mapper and return that Instance
            var mapper = new Mapper(config);
            return mapper;
        }
    }
}
