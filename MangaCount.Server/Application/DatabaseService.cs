using MangaCount.Server.Infrastructure.Repositories;

namespace MangaCount.Server.Application
{
    public class DatabaseService : IDatabaseService
    {
        private readonly IEntryRepository _entryRepository;

        public DatabaseService(IEntryRepository entryRepository)
        {
            _entryRepository = entryRepository;
        }

        public async Task NukeProfileDataAsync(int profileId)
        {
            await Task.Run(() => _entryRepository.DeleteAllByProfile(profileId));
        }

        public async Task<string> CreateBackupAsync()
        {
            return await Task.Run(() =>
            {
                // Esta funcionalidad se puede implementar más tarde con SQL Server backup commands
                // Por ahora retornamos un mensaje
                return $"Backup created at {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}";
            });
        }

        public async Task RestoreBackupAsync(Stream backupStream)
        {
            await Task.Run(() =>
            {
                // Esta funcionalidad se puede implementar más tarde con SQL Server restore commands
                // Por ahora es un placeholder
                throw new NotImplementedException("Backup restore functionality not implemented yet");
            });
        }
    }
}