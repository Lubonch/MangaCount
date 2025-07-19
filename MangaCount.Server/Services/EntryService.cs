using AutoMapper;
using MangaCount.Server.Configs;
using MangaCount.Server.Domain;
using MangaCount.Server.Model;
using MangaCount.Server.Repositories;
using MangaCount.Server.Repositories.Contracts;
using System.Net;

namespace MangaCount.Server.Services
{
    public class EntryService : IEntryService
    {
        private IEntryRepository _entryRepository;
        private IMangaRepository _mangaRepository;
        private Mapper mapper;
        public EntryService(IEntryRepository entryRepository, IMangaRepository mangaRepository)
        {
            _entryRepository = entryRepository;
            _mangaRepository = mangaRepository;
            mapper = MapperConfig.InitializeAutomapper();
        }
        public List<EntryModel> GetAllEntries()
        {
            var mangaList = _entryRepository.GetAllEntries();

            return mapper.Map<List<EntryModel>>(mangaList);
        }

        public EntryModel GetEntryById(int Id)
        {
            var manga = _entryRepository.GetById(Id);

            return mapper.Map<EntryModel>(manga);
        }
        
        public HttpResponseMessage ImportFromFile(String filePath)
        {
            if (CheckFileType(Path.GetFileName(filePath)))
            {
                IList<Domain.Entry> entryList = GetFileData(filePath);
                try
                {
                    foreach (Domain.Entry entry in entryList)
                    {
                        entry.MangaId = _mangaRepository.Create(entry.Manga).Id;
                        _entryRepository.Create(entry);
                    }
                }
                catch (Exception ex)
                {
                    //TODO error logging
                    throw;
                }
            }
            else
            {
                throw new InvalidOperationException("File Must be a .tsv file");
            }

            return new HttpResponseMessage(HttpStatusCode.OK);
        }

        public async Task<HttpResponseMessage> ImportFromFileAsync(IFormFile file)
        {
            if (!CheckFileType(file.FileName))
            {
                throw new InvalidOperationException("File must be a .tsv file");
            }

            try
            {
                IList<Domain.Entry> entryList = await GetFileDataFromUpload(file);
                
                foreach (Domain.Entry entry in entryList)
                {
                    entry.MangaId = _mangaRepository.Create(entry.Manga).Id;
                    _entryRepository.Create(entry);
                }

                return new HttpResponseMessage(HttpStatusCode.OK);
            }
            catch (Exception ex)
            {
                //TODO error logging
                throw;
            }
        }

        private async Task<IList<Domain.Entry>> GetFileDataFromUpload(IFormFile file)
        {
            IList<Domain.Entry> entryList = new List<Domain.Entry>();
            
            try
            {
                using (var reader = new StreamReader(file.OpenReadStream()))
                {
                    string currentLine;
                    int counter = 0;
                    
                    while ((currentLine = await reader.ReadLineAsync()) != null)
                    {
                        if (counter > 0) // Skip header row
                        {
                            string[] item = currentLine.Split("\t");
                            if (!String.IsNullOrEmpty(item[0]))
                            {
                                int value;
                                entryList.Add(new Domain.Entry()
                                {
                                    Manga = new Domain.Manga() 
                                    { 
                                        Name = item[0], 
                                        Volumes = int.TryParse(item[2], out value) ? value : null 
                                    },
                                    MangaId = 0,
                                    Quantity = int.TryParse(item[1], out value) ? value : 0,
                                    Pending = item.Length > 3 ? item[3] : null,
                                    Priority = item.Length > 5 ? Boolean.Parse(item[5]) : false
                                });
                            }
                        }
                        counter++;
                    }
                }
            }
            catch (Exception ex)
            {
                //TODO error logging
                throw;
            }

            return entryList;
        }

        private IList<Domain.Entry> GetFileData(String filePath)
        {
            IList<Domain.Entry> entryList = new List<Domain.Entry>();
            try
            {
                using (StreamReader sr = new StreamReader(filePath))
                {
                    string currentLine;
                    int counter = 0;
                    while ((currentLine = sr.ReadLine()) != null)
                    {
                        if (counter > 0)
                        {
                            string[] item = currentLine.Split("\t");
                            if (!String.IsNullOrEmpty(item[0]))
                            {
                                int value;
                                entryList.Add(new Domain.Entry()
                                {
                                    Manga = new Domain.Manga() { Name = item[0], Volumes = int.TryParse(item[2], out value) ? value : null },
                                    MangaId = 0,
                                    Quantity = int.TryParse(item[1], out value) ? value : 0,
                                    Pending = item[3],
                                    Priority = Boolean.Parse(item[5])
                                });
                            }
                        }
                        counter++;
                    }
                }
            }
            catch (Exception ex)
            {
                //TODO error logging
                throw;
            }

            return entryList;
        }

        public HttpResponseMessage SaveOrUpdate(DTO.EntryDTO entryDTO)
        {
            Domain.Entry entry = mapper.Map<Domain.Entry>(entryDTO);
            Entry queryResult;
            HttpResponseMessage result;

            if (entry.Id == 0)
            {
                queryResult = _entryRepository.Create(entry);
            }
            else
            {
                queryResult = _entryRepository.Update(entry);
            }
            result = queryResult != null ? new HttpResponseMessage(HttpStatusCode.OK) : new HttpResponseMessage(HttpStatusCode.Forbidden);

            return result;
        }
        private bool CheckFileType(string fileName)
        {
            string ext = Path.GetExtension(fileName);
            switch (ext.ToLower())
            {
                case ".tsv":
                    return true;
                default:
                    return false;
            }
        }
    }
}
