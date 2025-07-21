namespace MangaCount.Server.Services.Contracts
{
    public interface IDatabaseService
    {
        Task<bool> NukeAllDataAsync();
        Task<DatabaseStatistics> GetDatabaseStatisticsAsync();
    }

    public class DatabaseStatistics
    {
        public int TotalEntries { get; set; }
        public int TotalManga { get; set; }
        public int TotalProfiles { get; set; }
        public int TotalFormats { get; set; }
        public int TotalPublishers { get; set; }
    }
}