using AutoMapper;
using MangaCount.Server.Configs;
using MangaCount.Server.Domain;
using MangaCount.Server.Model;
using MangaCount.Server.Repositories.Contracts;
using MangaCount.Server.Services.Contracts;
using System.Net;

namespace MangaCount.Server.Services
{
    public class MangaService : IMangaService
    {

        private IMangaRepository _mangaRepository;
        private Mapper mapper;

        public MangaService(IMangaRepository mangaRepository)
        {
            _mangaRepository = mangaRepository;
            mapper = MapperConfig.InitializeAutomapper();
        }
        public List<MangaModel> GetAllMangas()
        {
            List<MangaModel> mangaList = mapper.Map<List<MangaModel>>(_mangaRepository.GetAllMangas());

            return mangaList;
        }

        public HttpResponseMessage SaveOrUpdate(DTO.MangaDTO mangaDTO)
        {
            Domain.Manga manga = mapper.Map<Domain.Manga>(mangaDTO);
            Manga queryResult;
            HttpResponseMessage result;

            if (manga.Id == 0)
            {
                queryResult = _mangaRepository.Create(manga);
            }
            else
            {
                queryResult = _mangaRepository.Update(manga);
            }

            result = queryResult != null ? new HttpResponseMessage(HttpStatusCode.OK) : new HttpResponseMessage(HttpStatusCode.Forbidden);

            return result;
        }
        public MangaModel GetMangaById(int Id)
        {
            var manga = mapper.Map<MangaModel>(_mangaRepository.GetById(Id));

            return manga;
        }

    }
}
