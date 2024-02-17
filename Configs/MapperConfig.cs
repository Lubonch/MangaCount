using AutoMapper;
using MangaCount.Domain;
using MangaCount.DTO;
using MangaCount.Models;

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

                //Configuring DTO to Model
                cfg.CreateMap<EntryDTO, EntryModel>();

                //Configuring DTO to Domain
                cfg.CreateMap<EntryDTO, Entry>();

                //Configuring Domain to DTO
                cfg.CreateMap<Entry, EntryDTO>();
            });
            //Create an Instance of Mapper and return that Instance
            var mapper = new Mapper(config);
            return mapper;
        }
    }
}
