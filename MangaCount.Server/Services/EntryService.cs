using AutoMapper;
using MangaCount.Server.Configs;
using MangaCount.Server.Domain;
using MangaCount.Server.Model;
using MangaCount.Server.Repositories;
using MangaCount.Server.Repositories.Contracts;
using System.Net;
using Microsoft.Data.SqlClient;
using Dapper;
using Microsoft.Extensions.Configuration;

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
        
        public List<EntryModel> GetAllEntries(int? profileId = null)
        {
            var entryList = _entryRepository.GetAllEntries(profileId);
            return mapper.Map<List<EntryModel>>(entryList);
        }

        public EntryModel GetEntryById(int Id)
        {
            var entry = _entryRepository.GetById(Id);
            return mapper.Map<EntryModel>(entry);
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
                catch (Exception)
                {
                    throw;
                }
            }
            else
            {
                throw new InvalidOperationException("File Must be a .tsv file");
            }

            return new HttpResponseMessage(HttpStatusCode.OK);
        }

        public async Task<HttpResponseMessage> ImportFromFileAsync(IFormFile file, int profileId)
        {
            if (!CheckFileType(file.FileName))
            {
                throw new InvalidOperationException("Invalid file type. Only TSV files are supported.");
            }

            try
            {
                IList<Domain.Entry> entryList = await GetFileDataFromUpload(file, profileId);
                
                foreach (Domain.Entry entry in entryList)
                {
                    var existingManga = _mangaRepository.GetAllMangas()
                        .FirstOrDefault(m => m.Name.Equals(entry.Manga.Name, StringComparison.OrdinalIgnoreCase));
                    
                    if (existingManga != null)
                    {
                        // Update existing manga with new format/publisher if needed
                        if (existingManga.FormatId != entry.Manga.FormatId || 
                            existingManga.PublisherId != entry.Manga.PublisherId)
                        {
                            existingManga.FormatId = entry.Manga.FormatId;
                            existingManga.PublisherId = entry.Manga.PublisherId;
                            _mangaRepository.Update(existingManga);
                        }
                        
                        entry.MangaId = existingManga.Id;
                        entry.Manga = existingManga;
                    }
                    else
                    {
                        // Create new manga with format and publisher
                        var createdManga = _mangaRepository.Create(entry.Manga);
                        entry.MangaId = createdManga.Id;
                    }
                    
                    _entryRepository.Create(entry);
                }

                return new HttpResponseMessage(HttpStatusCode.OK);
            }
            catch (Exception)
            {
                throw;
            }
        }

        public List<dynamic> GetSharedManga(int profileId1, int profileId2)
        {
            var entries = _entryRepository.GetEntriesByProfileIds(profileId1, profileId2);
            
            var sharedManga = entries
                .GroupBy(e => e.MangaId)
                .Where(g => g.Select(e => e.ProfileId).Distinct().Count() > 1)
                .Select(g => new
                {
                    MangaId = g.Key,
                    MangaName = g.First().Manga.Name,
                    TotalVolumes = g.First().Manga.Volumes,
                    Profile1Entry = g.FirstOrDefault(e => e.ProfileId == profileId1),
                    Profile2Entry = g.FirstOrDefault(e => e.ProfileId == profileId2)
                })
                .Select(x => new
                {
                    x.MangaId,
                    x.MangaName,
                    x.TotalVolumes,
                    Profile1Quantity = x.Profile1Entry?.Quantity ?? 0,
                    Profile2Quantity = x.Profile2Entry?.Quantity ?? 0,
                    Profile1Pending = x.Profile1Entry?.Pending,
                    Profile2Pending = x.Profile2Entry?.Pending,
                    Profile1Priority = x.Profile1Entry?.Priority ?? false,
                    Profile2Priority = x.Profile2Entry?.Priority ?? false,
                    CombinedQuantity = (x.Profile1Entry?.Quantity ?? 0) + (x.Profile2Entry?.Quantity ?? 0),
                    IsCollectionComplete = x.TotalVolumes.HasValue && 
                        ((x.Profile1Entry?.Quantity ?? 0) + (x.Profile2Entry?.Quantity ?? 0)) >= x.TotalVolumes.Value
                })
                .Cast<dynamic>()
                .ToList();

            return sharedManga;
        }

        private async Task<IList<Domain.Entry>> GetFileDataFromUpload(IFormFile file, int profileId)
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
                                
                                // Parse the new TSV format:
                                // Titulo | Comprados | Total | Pendiente | Completa | Prioridad | Formato | Editorial
                                string mangaName = item[0];
                                int quantity = int.TryParse(item[1], out value) ? value : 0;
                                int? totalVolumes = int.TryParse(item[2], out value) ? value : null;
                                string pending = item.Length > 3 ? item[3] : null;
                                bool complete = item.Length > 4 && bool.TryParse(item[4], out bool completeValue) ? completeValue : false;
                                bool priority = item.Length > 5 && bool.TryParse(item[5], out bool priorityValue) ? priorityValue : false;
                                string formatName = item.Length > 6 ? item[6] : "Unknown";
                                string publisherName = item.Length > 7 ? item[7] : "Unknown";

                                // Find or create Format
                                int formatId = await GetOrCreateFormatId(formatName);
                                
                                // Find or create Publisher
                                int publisherId = await GetOrCreatePublisherId(publisherName);

                                entryList.Add(new Domain.Entry()
                                {
                                    Manga = new Domain.Manga() 
                                    { 
                                        Name = mangaName, 
                                        Volumes = totalVolumes,
                                        FormatId = formatId,
                                        PublisherId = publisherId
                                    },
                                    MangaId = 0,
                                    ProfileId = profileId,
                                    Quantity = quantity,
                                    Pending = pending,
                                    Priority = priority
                                });
                            }
                        }
                        counter++;
                    }
                }
            }
            catch (Exception)
            {
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
                                    ProfileId = 1,
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
            catch (Exception)
            {
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

        private async Task<int> GetOrCreateFormatId(string formatName)
        {
            try
            {
                IConfigurationRoot _configuration = new ConfigurationBuilder()
                    .SetBasePath(Directory.GetCurrentDirectory())
                    .AddJsonFile("appsettings.json")
                    .Build();

                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                using var connection = new SqlConnection(connString);
                await connection.OpenAsync();

                // Try to find existing format
                var existingFormat = await connection.QuerySingleOrDefaultAsync<Domain.Format>(
                    "SELECT * FROM [dbo].[Formats] WHERE [Name] = @Name", 
                    new { Name = formatName });

                if (existingFormat != null)
                {
                    return existingFormat.Id;
                }

                // Create new format if it doesn't exist
                var newId = await connection.QuerySingleAsync<int>(
                    "INSERT INTO [dbo].[Formats] ([Name]) VALUES (@Name); SELECT CAST(SCOPE_IDENTITY() as int);",
                    new { Name = formatName });

                return newId;
            }
            catch (Exception)
            {
                // Return default format ID if there's an error
                return 1; // "Unknown" format
            }
        }

        private async Task<int> GetOrCreatePublisherId(string publisherName)
        {
            try
            {
                IConfigurationRoot _configuration = new ConfigurationBuilder()
                    .SetBasePath(Directory.GetCurrentDirectory())
                    .AddJsonFile("appsettings.json")
                    .Build();

                string connString = _configuration.GetConnectionString("MangacountDatabase")!;

                using var connection = new SqlConnection(connString);
                await connection.OpenAsync();

                // Try to find existing publisher
                var existingPublisher = await connection.QuerySingleOrDefaultAsync<Domain.Publisher>(
                    "SELECT * FROM [dbo].[Publishers] WHERE [Name] = @Name", 
                    new { Name = publisherName });

                if (existingPublisher != null)
                {
                    return existingPublisher.Id;
                }

                // Create new publisher if it doesn't exist
                var newId = await connection.QuerySingleAsync<int>(
                    "INSERT INTO [dbo].[Publishers] ([Name]) VALUES (@Name); SELECT CAST(SCOPE_IDENTITY() as int);",
                    new { Name = publisherName });

                return newId;
            }
            catch (Exception)
            {
                // Return default publisher ID if there's an error
                return 1; // "Unknown" publisher
            }
        }
    }
}
