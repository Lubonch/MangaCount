using AutoMapper;
using MangaCount.Server.Configs;
using MangaCount.Server.Domain;
using MangaCount.Server.Model;
using MangaCount.Server.Repositories.Contracts;
using MangaCount.Server.Services.Contracts;
using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;


namespace MangaCount.Server.Services
{
    public class MangaService : IMangaService
    {

        private IMangaRepository _mangaRepository;
        private IConfiguration configuration;
        private Mapper mapper;

        public MangaService(IMangaRepository mangaRepository, IConfiguration configuration)
        {
            _mangaRepository = mangaRepository;
            mapper = MapperConfig.InitializeAutomapper();
            this.configuration = configuration;
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

        public async Task<string> GetMangaFromISBNAsync(string ISBNCode)
        {
            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(configuration.GetValue<string>("APIs:Book"));
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                string searchParams = $"bibkeys={ISBNCode}&jscmd=details&format=json";
                string actionValue = $"api/books?{searchParams}";
                HttpResponseMessage response = await client.GetAsync(actionValue);

                if (response.IsSuccessStatusCode)
                {
                    string json = await response.Content.ReadAsStringAsync();
                    // Optionally parse and return a strongly-typed object here
                    return json;
                }
                else
                {
                    // Log or handle error
                    return $"Error: {response.StatusCode}";
                }
            }
        }
    }
}
