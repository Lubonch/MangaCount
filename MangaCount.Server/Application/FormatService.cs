using MangaCount.Server.Domain;
using MangaCount.Server.Infrastructure.Repositories;

namespace MangaCount.Server.Application
{
    public class FormatService : IFormatService
    {
        private readonly IFormatRepository _formatRepository;

        public FormatService(IFormatRepository formatRepository)
        {
            _formatRepository = formatRepository;
        }

        public async Task<IEnumerable<Format>> GetAllFormatsAsync()
        {
            return await Task.Run(() => _formatRepository.GetAll());
        }

        public async Task<Format?> GetFormatByIdAsync(int id)
        {
            return await Task.Run(() => _formatRepository.GetById(id));
        }

        public async Task<Format> SaveFormatAsync(Format format)
        {
            return await Task.Run(() => _formatRepository.Save(format));
        }

        public async Task DeleteFormatAsync(int id)
        {
            await Task.Run(() =>
            {
                var format = _formatRepository.GetById(id);
                if (format != null)
                {
                    _formatRepository.Delete(format);
                }
            });
        }
    }
}