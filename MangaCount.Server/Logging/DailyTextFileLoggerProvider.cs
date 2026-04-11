using Microsoft.Extensions.Logging;

namespace MangaCount.Server.Logging
{
    public class DailyTextFileLoggerProvider : ILoggerProvider
    {
        private readonly DailyTextFileWriter _writer;

        public DailyTextFileLoggerProvider(DailyTextFileWriter writer)
        {
            _writer = writer;
        }

        public ILogger CreateLogger(string categoryName)
        {
            return new DailyTextFileLogger(categoryName, _writer);
        }

        public void Dispose()
        {
        }
    }
}