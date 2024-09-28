using AutoMapper;
using DocumentFormat.OpenXml.Wordprocessing;
using log4net;
using MangaCount.Configs;
using MangaCount.Configs.Contracts;
using MangaCount.Domain;
using MangaCount.Repositories.Contracts;
using MangaCount.Services.Contracts;
using Microsoft.CodeAnalysis.Options;
using Newtonsoft.Json.Linq;
using NHibernate;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json.Nodes;

namespace MangaCount.Services
{
    public class MangaService : IMangaService
    {
        private IMangaRepository _mangaRepository;
        private IConfiguration configuration;
        private Mapper mapper;

        public MangaService(IMangaRepository mangaRepository, IConfiguration configuration)
        {
            _mangaRepository = mangaRepository;
            this.configuration = configuration;
            mapper = MapperConfig.InitializeAutomapper();
        }
        public List<Domain.Manga> GetAllMangas()
        {
            var mangaList = _mangaRepository.GetAllMangas();

            return mangaList;
        }

        public HttpResponseMessage SaveOrUpdate(DTO.MangaDTO mangaDTO)
        {
            Domain.Manga manga = mapper.Map<Domain.Manga>(mangaDTO);

            using (NHibernate.ISession session = NhibernateConfig.OpenSession())
            {
                using (ITransaction tx = session.BeginTransaction())
                {
                    session.SaveOrUpdate(manga);
                    tx.Commit();
                }
            }
            //TODO Error Catching
            return new HttpResponseMessage(HttpStatusCode.OK);
        }
        public Domain.Manga GetMangaById(int Id)
        {
            var manga = _mangaRepository.Get(Id);

            return manga;
        }
        //private String GetMangaFromISBN2(String ISBNCode)
        //{
        //    //var manga = _entryRepository.Get(Id);
        //    HttpClient client = new HttpClient();
        //    client.BaseAddress = configuration.GetValue<Uri>("APIs:Book");
        //    client.DefaultRequestHeaders.Accept.Clear();
        //    client.DefaultRequestHeaders.Accept.Add(
        //        new MediaTypeWithQualityHeaderValue("application/json"));

        //    HttpResponseMessage response = client.GetAsync(ISBNCode).Result;

        //    String o1 = JObject.Parse(File.ReadAllText(@"C:\repos\json\test.json")).ToString();

        //    return o1;
        //}
        public String GetMangaFromISBN(String ISBNCode)
        {
            Library library;
            string json = "";
            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(configuration.GetValue<string>("APIs:Book"));
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                string searchParams = string.Concat("bibkeys=", ISBNCode, "&jscmd=", "details", "&format=", "json");
                string actionValue = "api/books" + "?" + searchParams;
                HttpResponseMessage response = client.GetAsync(actionValue).Result;

                if (response.IsSuccessStatusCode)
                {
                    json = response.Content.ReadAsStringAsync().Result;
                    JsonNode libraryResult = JsonNode.Parse(json)!;
                    //Log.DebugFormat("GetLastUpdateDate Json String {0}", json);
                    library = libraryResult[ISBNCode]!.GetValue<Library>();


                }
                else
                {


                }
                //var parameters = new Dictionary<String, String> { { "bibkeys", ISBNCode }, { "jscmd", "details" }, { "format", "json" } };
                //var encodedContent = new FormUrlEncodedContent(parameters);

                //var manga = _entryRepository.Get(Id);
                //var client = new HttpClient();
                //var request = new HttpRequestMessage(HttpMethod.Get, configuration.GetValue<string>("APIs:Book"));
                //request.Content = encodedContent;

                //var response = await client.SendAsync(request);
                //client.
                ///object value = response.EnsureSuccessStatusCode();
                //Console.WriteLine(response.Content.ReadAsStringAsync());

                //String o1 = await response.Content.ReadAsStringAsync();

                return json;
            }
        }
    }
}
