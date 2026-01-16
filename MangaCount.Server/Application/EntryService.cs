using AutoMapper;
using MangaCount.Server.Domain;
using MangaCount.Server.DTO;
using MangaCount.Server.Infrastructure.Repositories;

namespace MangaCount.Server.Application
{
    public class EntryService : IEntryService
    {
        private readonly IEntryRepository _entryRepository;
        private readonly IMangaRepository _mangaRepository;
        private readonly IMapper _mapper;

        public EntryService(
            IEntryRepository entryRepository, 
            IMangaRepository mangaRepository,
            IMapper mapper)
        {
            _entryRepository = entryRepository;
            _mangaRepository = mangaRepository;
            _mapper = mapper;
        }

        public async Task<IEnumerable<EntryDto>> GetAllEntriesAsync(int? profileId = null)
        {
            return await Task.Run(() =>
            {
                var entries = _entryRepository.GetAll(profileId);
                return _mapper.Map<IEnumerable<EntryDto>>(entries);
            });
        }

        public async Task<EntryDto?> GetEntryByIdAsync(int id)
        {
            return await Task.Run(() =>
            {
                var entry = _entryRepository.GetById(id);
                return entry != null ? _mapper.Map<EntryDto>(entry) : null;
            });
        }

        public async Task<EntryDto> SaveEntryAsync(EntryCreateDto entryDto)
        {
            return await Task.Run(() =>
            {
                var entry = _mapper.Map<Entry>(entryDto);
                var savedEntry = _entryRepository.Save(entry);
                return _mapper.Map<EntryDto>(savedEntry);
            });
        }

        public async Task DeleteEntryAsync(int id)
        {
            await Task.Run(() =>
            {
                var entry = _entryRepository.GetById(id);
                if (entry != null)
                {
                    _entryRepository.Delete(entry);
                }
            });
        }

        public async Task<IEnumerable<EntryDto>> GetEntriesByProfileAsync(int profileId)
        {
            return await Task.Run(() =>
            {
                var entries = _entryRepository.GetByProfileId(profileId);
                return _mapper.Map<IEnumerable<EntryDto>>(entries);
            });
        }

        public async Task<IEnumerable<dynamic>> GetUsedFormatsAsync(int? profileId = null)
        {
            return await Task.Run(() => _entryRepository.GetUsedFormats(profileId));
        }

        public async Task<IEnumerable<dynamic>> GetUsedPublishersAsync(int? profileId = null)
        {
            return await Task.Run(() => _entryRepository.GetUsedPublishers(profileId));
        }

        public async Task ImportFromTsvAsync(int profileId, Stream fileStream)
        {
            await Task.Run(() =>
            {
                using var reader = new StreamReader(fileStream);
                var content = reader.ReadToEnd();
                var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);

                // Skip header if exists
                var startIndex = lines.Length > 0 && lines[0].Contains('\t') ? 1 : 0;

                for (int i = startIndex; i < lines.Length; i++)
                {
                    var parts = lines[i].Split('\t');
                    if (parts.Length >= 3)
                    {
                        var mangaName = parts[0].Trim();
                        if (int.TryParse(parts[1].Trim(), out var quantity))
                        {
                            var pending = parts.Length > 2 ? parts[2].Trim() : null;
                            var priority = parts.Length > 3 && bool.TryParse(parts[3].Trim(), out var p) && p;

                            // Find or create manga
                            var existingMangas = _mangaRepository.GetAll();
                            var manga = existingMangas.FirstOrDefault(m => m.Name.Equals(mangaName, StringComparison.OrdinalIgnoreCase));

                            if (manga == null)
                            {
                                manga = new Manga
                                {
                                    Name = mangaName,
                                    FormatId = 1, // Default format
                                    PublisherId = 1 // Default publisher
                                };
                                manga = _mangaRepository.Save(manga);
                            }

                            // Create entry
                            var entry = new Entry
                            {
                                MangaId = manga.Id,
                                ProfileId = profileId,
                                Quantity = quantity,
                                Pending = string.IsNullOrWhiteSpace(pending) ? null : pending,
                                Priority = priority
                            };

                            _entryRepository.Save(entry);
                        }
                    }
                }
            });
        }

        public async Task DeleteAllByProfileAsync(int profileId)
        {
            await Task.Run(() => _entryRepository.DeleteAllByProfile(profileId));
        }
    }
}