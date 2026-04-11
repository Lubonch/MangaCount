namespace MangaCount.Server.Logging
{
    public class DailyTextFileWriter
    {
        private readonly string _logsFolder;
        private readonly string _currentFileName;
        private readonly Func<DateTime> _now;
        private readonly object _sync = new();

        public DailyTextFileWriter(string logsFolder, string currentFileName, Func<DateTime>? now = null)
        {
            _logsFolder = Path.IsPathRooted(logsFolder)
                ? logsFolder
                : Path.GetFullPath(logsFolder, Directory.GetCurrentDirectory());
            _currentFileName = currentFileName;
            _now = now ?? (() => DateTime.Now);
        }

        public void WriteLine(string line)
        {
            lock (_sync)
            {
                Directory.CreateDirectory(_logsFolder);
                RotateIfNeeded();
                File.AppendAllText(GetCurrentFilePath(), line + Environment.NewLine);
            }
        }

        private void RotateIfNeeded()
        {
            var currentFilePath = GetCurrentFilePath();
            if (!File.Exists(currentFilePath))
            {
                return;
            }

            var currentFile = new FileInfo(currentFilePath);
            if (currentFile.Length == 0)
            {
                return;
            }

            var lastWriteDate = currentFile.LastWriteTime.Date;
            var today = _now().Date;

            if (lastWriteDate == today)
            {
                return;
            }

            var archivedFilePath = Path.Combine(_logsFolder, BuildArchivedFileName(lastWriteDate));
            if (File.Exists(archivedFilePath))
            {
                File.AppendAllText(archivedFilePath, File.ReadAllText(currentFilePath));
                File.Delete(currentFilePath);
                return;
            }

            File.Move(currentFilePath, archivedFilePath);
        }

        private string GetCurrentFilePath()
        {
            return Path.Combine(_logsFolder, _currentFileName);
        }

        private string BuildArchivedFileName(DateTime lastWriteDate)
        {
            var baseName = Path.GetFileNameWithoutExtension(_currentFileName);
            return $"{baseName}.{lastWriteDate:yyyy-MM-dd}";
        }
    }
}