using FluentAssertions;
using MangaCount.Server.Logging;
using Xunit;

namespace MangaCount.Server.Tests.Logging
{
    public class DailyTextFileWriterTests : IDisposable
    {
        private readonly string _tempDirectory;

        public DailyTextFileWriterTests()
        {
            _tempDirectory = Path.Combine(Path.GetTempPath(), $"mangacount-backend-logs-{Guid.NewGuid():N}");
            Directory.CreateDirectory(_tempDirectory);
        }

        [Fact]
        public void WriteLine_RotatesANonEmptyCurrentFileWhenTheDateChanges()
        {
            var currentDate = new DateTime(2026, 4, 11, 10, 0, 0, DateTimeKind.Local);
            var writer = new DailyTextFileWriter(_tempDirectory, "backend.txt", () => currentDate);

            writer.WriteLine("first line");

            var currentFilePath = Path.Combine(_tempDirectory, "backend.txt");
            File.SetLastWriteTime(currentFilePath, new DateTime(2026, 4, 11, 9, 0, 0, DateTimeKind.Local));

            currentDate = new DateTime(2026, 4, 12, 8, 0, 0, DateTimeKind.Local);
            writer.WriteLine("second line");

            var archivedFilePath = Path.Combine(_tempDirectory, "backend.2026-04-11");
            File.Exists(archivedFilePath).Should().BeTrue();
            File.ReadAllText(archivedFilePath).Should().Contain("first line");
            File.ReadAllText(currentFilePath).Should().Contain("second line");
        }

        [Fact]
        public void WriteLine_DoesNotRotateAnEmptyCurrentFileWhenTheDateChanges()
        {
            var currentDate = new DateTime(2026, 4, 12, 8, 0, 0, DateTimeKind.Local);
            var currentFilePath = Path.Combine(_tempDirectory, "backend.txt");
            File.WriteAllText(currentFilePath, string.Empty);
            File.SetLastWriteTime(currentFilePath, new DateTime(2026, 4, 11, 9, 0, 0, DateTimeKind.Local));

            var writer = new DailyTextFileWriter(_tempDirectory, "backend.txt", () => currentDate);

            writer.WriteLine("today line");

            File.Exists(Path.Combine(_tempDirectory, "backend.2026-04-11")).Should().BeFalse();
            File.ReadAllText(currentFilePath).Should().Contain("today line");
        }

        [Fact]
        public void WriteLine_AppendsToTheCurrentFileWhenTheDateDoesNotChange()
        {
            var currentDate = new DateTime(2026, 4, 12, 8, 0, 0, DateTimeKind.Local);
            var writer = new DailyTextFileWriter(_tempDirectory, "backend.txt", () => currentDate);

            writer.WriteLine("line one");
            File.SetLastWriteTime(Path.Combine(_tempDirectory, "backend.txt"), currentDate);
            writer.WriteLine("line two");

            var currentFilePath = Path.Combine(_tempDirectory, "backend.txt");
            File.ReadAllText(currentFilePath).Should().Contain("line one").And.Contain("line two");
            Directory.GetFiles(_tempDirectory).Should().ContainSingle(file => file.EndsWith("backend.txt"));
        }

        public void Dispose()
        {
            if (Directory.Exists(_tempDirectory))
            {
                Directory.Delete(_tempDirectory, true);
            }
        }
    }
}