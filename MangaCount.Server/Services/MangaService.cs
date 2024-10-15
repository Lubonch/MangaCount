using MangaCount.Server.Repositories.Contracts;
using MangaCount.Server.Services.Contracts;
using System.Net;

namespace MangaCount.Server.Services
{
    public class MangaService : IMangaService
    {
        private IMangaRepository _mangaRepository;
        //private Mapper mapper;
        public MangaService(IMangaRepository mangaRepository)
        {
            _mangaRepository = mangaRepository;
            //mapper = MapperConfig.InitializeAutomapper();
        }
        public List<Domain.Manga> GetAllMangas()
        {
            var mangaList = _mangaRepository.GetAllMangas();

            return mangaList;
        }

        //public HttpResponseMessage SaveOrUpdate(DTO.MangaDTO mangaDTO)
        //{
        //    Domain.Manga manga = mapper.Map<Domain.Manga>(mangaDTO);

        //    using (NHibernate.ISession session = NhibernateConfig.OpenSession())
        //    {
        //        using (ITransaction tx = session.BeginTransaction())
        //        {
        //            session.SaveOrUpdate(manga);
        //            tx.Commit();
        //        }
        //    }
        //    //TODO Error Catching
        //    return new HttpResponseMessage(HttpStatusCode.OK);
        //}

        public void CreateManga(Domain.Manga manga)
        {
            _mangaRepository.CreateManga(manga);
        }
        public Domain.Manga GetMangaById(int Id)
        {
            var manga = _mangaRepository.GetMangaById(Id);

            return manga;
        }
    }
}
