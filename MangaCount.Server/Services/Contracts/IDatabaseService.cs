namespace MangaCount.Server.Services.Contracts
{
    public interface IDatabaseService
    {
        Task<bool> NukeAllDataAsync();
        Task<bool> SelectiveDeleteAsync(SelectiveDeletionOptions options);
        Task<DatabaseStatistics> GetDatabaseStatisticsAsync();
        Task<DeletionPreview> GetDeletionPreviewAsync(SelectiveDeletionOptions options);
    }

    public class DatabaseStatistics
    {
        public int TotalEntries { get; set; }
        public int TotalManga { get; set; }
        public int TotalProfiles { get; set; }
        public int TotalFormats { get; set; }
        public int TotalPublishers { get; set; }
    }

    public class SelectiveDeletionOptions
    {
        public bool DeleteEntries { get; set; }
        public bool DeleteManga { get; set; }
        public bool DeleteProfiles { get; set; }
        public bool DeleteFormats { get; set; }
        public bool DeletePublishers { get; set; }
        public bool ResetIdentities { get; set; } = true;
        public bool KeepDefaultFormatsAndPublishers { get; set; } = true;
    }

    public class DeletionPreview
    {
        public bool IsValid { get; set; }
        public List<string> Warnings { get; set; } = new();
        public List<string> Actions { get; set; } = new();
        public int EstimatedEntriesDeleted { get; set; }
        public int EstimatedMangaDeleted { get; set; }
        public int EstimatedProfilesDeleted { get; set; }
        public int EstimatedFormatsDeleted { get; set; }
        public int EstimatedPublishersDeleted { get; set; }
    }
}