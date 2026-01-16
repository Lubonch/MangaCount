using AutoMapper;
using MangaCount.Server.Domain;
using MangaCount.Server.DTO;
using MangaCount.Server.Infrastructure.Repositories;

namespace MangaCount.Server.Application
{
    public class MangaService : IMangaService
    {
        private readonly IMangaRepository _mangaRepository;
        private readonly IMapper _mapper;

        public MangaService(IMangaRepository mangaRepository, IMapper mapper)
        {
            _mangaRepository = mangaRepository;
            _mapper = mapper;
        }

        public async Task<IEnumerable<MangaDto>> GetAllMangasAsync()
        {
            return await Task.Run(() =>
            {
                var mangas = _mangaRepository.GetAll();
                return _mapper.Map<IEnumerable<MangaDto>>(mangas);
            });
        }

        public async Task<MangaDto?> GetMangaByIdAsync(int id)
        {
            return await Task.Run(() =>
            {
                var manga = _mangaRepository.GetById(id);
                return manga != null ? _mapper.Map<MangaDto>(manga) : null;
            });
        }

        public async Task<MangaDto> SaveMangaAsync(MangaCreateDto mangaDto)
        {
            return await Task.Run(() =>
            {
                var manga = _mapper.Map<Manga>(mangaDto);
                var savedManga = _mangaRepository.Save(manga);
                return _mapper.Map<MangaDto>(savedManga);
            });
        }

        public async Task<MangaDto> UpdateMangaAsync(int id, MangaCreateDto mangaDto)
        {
            return await Task.Run(() =>
            {
                var existingManga = _mangaRepository.GetById(id);
                if (existingManga == null)
                    throw new ArgumentException($"Manga with ID {id} not found");

                _mapper.Map(mangaDto, existingManga);
                var updatedManga = _mangaRepository.Save(existingManga);
                return _mapper.Map<MangaDto>(updatedManga);
            });
        }

        public async Task DeleteMangaAsync(int id)
        {
            await Task.Run(() =>
            {
                var manga = _mangaRepository.GetById(id);
                if (manga != null)
                {
                    _mangaRepository.Delete(manga);
                }
            });
        }
    }
}