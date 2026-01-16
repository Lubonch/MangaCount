namespace MangaCount.Server.Application
{
    public interface IDatabaseService
    {
        Task NukeProfileDataAsync(int profileId);
        Task<string> CreateBackupAsync();
        Task RestoreBackupAsync(Stream backupStream);
    }
}