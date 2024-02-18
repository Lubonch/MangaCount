using MangaCount.Configs;
using MangaCount.Configs.Contracts;
using MangaCount.Repositories.Contracts;
using MangaCount.Services.Contracts;
using NHibernate;
using System.Net;
using System.Net.Http;

namespace MangaCount.Services
{
    public class EntryService : IEntryService
    {
        private IEntryRepository _entryRepository;
        private IMangaRepository _mangaRepository;
        public EntryService(IEntryRepository entryRepository, IMangaRepository mangaRepository)
        {
            _entryRepository = entryRepository;
            _mangaRepository = mangaRepository;
        }
        public List<Domain.Entry> GetAllEntries()
        {
            var mangaList = _entryRepository.GetAllEntries();

            return mangaList;
        }

        public HttpResponseMessage ImportFromFile(String filePath) 
        {
            if (CheckFileType(Path.GetFileName(filePath)))
            {
                IList<Domain.Entry> entryList = GetFileData(filePath);
                try
                {
                    foreach(Domain.Entry entry in entryList)
                    {
                        entry.Manga.Id = _mangaRepository.Save(entry.Manga);                        
                        _entryRepository.Save(entry);
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
                throw new InvalidOperationException("File Must be a .csv file");
            }

            return new HttpResponseMessage(HttpStatusCode.OK);
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
            catch(Exception ex) 
            {
                //TODO error logging
                throw;
            }

            return entryList;
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
