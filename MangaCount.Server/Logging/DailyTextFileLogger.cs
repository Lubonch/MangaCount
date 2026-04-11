using Microsoft.Extensions.Logging;

namespace MangaCount.Server.Logging
{
    public class DailyTextFileLogger : ILogger
    {
        private readonly string _categoryName;
        private readonly DailyTextFileWriter _writer;

        public DailyTextFileLogger(string categoryName, DailyTextFileWriter writer)
        {
            _categoryName = categoryName;
            _writer = writer;
        }

        public IDisposable BeginScope<TState>(TState state) where TState : notnull
        {
            return NullScope.Instance;
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            return logLevel != LogLevel.None;
        }

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel))
            {
                return;
            }

            var message = formatter(state, exception);
            if (string.IsNullOrWhiteSpace(message) && exception is null)
            {
                return;
            }

            var line = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] [{logLevel}] [{_categoryName}] {message}";
            if (exception is not null)
            {
                line += $"{Environment.NewLine}{exception}";
            }

            _writer.WriteLine(line);
        }

        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();

            public void Dispose()
            {
            }
        }
    }
}