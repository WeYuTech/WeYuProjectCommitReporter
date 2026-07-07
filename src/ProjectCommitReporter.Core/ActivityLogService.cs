namespace ProjectCommitReporter.Core;

public sealed class ActivityLogService(IClock clock)
{
    private const int MaxEntries = 300;
    private const int MaxTextLength = 2000;
    private readonly object gate = new();
    private readonly List<ActivityLogEntry> entries = [];
    private long nextId;

    public ActivityLogResponse GetRecent(int take = 160)
    {
        lock (gate)
        {
            var count = Math.Clamp(take, 1, MaxEntries);
            var recent = entries
                .OrderBy(entry => entry.Id)
                .TakeLast(count)
                .ToList();
            return new ActivityLogResponse(recent, entries.Count(entry => entry.IsRunning));
        }
    }

    public long Info(string source, string message)
    {
        return Add(ActivityLogLevel.Info, source, message);
    }

    public long Success(string source, string message)
    {
        return Add(ActivityLogLevel.Success, source, message);
    }

    public long Warning(string source, string message)
    {
        return Add(ActivityLogLevel.Warning, source, message);
    }

    public long Error(string source, string message, string? error = null)
    {
        return Add(ActivityLogLevel.Error, source, message, error: error);
    }

    public long StartCommand(string repositoryPath, string command)
    {
        var repositoryName = Path.GetFileName(repositoryPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));
        return Add(
            ActivityLogLevel.Info,
            "git",
            $"Running in {repositoryName}",
            command,
            repositoryPath,
            isRunning: true);
    }

    public void CompleteCommand(long id, int exitCode, string output, string error)
    {
        lock (gate)
        {
            var index = entries.FindIndex(entry => entry.Id == id);
            if (index < 0)
            {
                return;
            }

            var current = entries[index];
            entries[index] = current with
            {
                Timestamp = clock.Now,
                Level = exitCode == 0 ? ActivityLogLevel.Success : ActivityLogLevel.Error,
                Message = exitCode == 0 ? "Command completed" : "Command failed",
                ExitCode = exitCode,
                Output = Normalize(output),
                Error = Normalize(error),
                IsRunning = false
            };
        }
    }

    private long Add(
        ActivityLogLevel level,
        string source,
        string message,
        string? command = null,
        string? repositoryPath = null,
        int? exitCode = null,
        string? output = null,
        string? error = null,
        bool isRunning = false)
    {
        lock (gate)
        {
            var entry = new ActivityLogEntry(
                ++nextId,
                clock.Now,
                level,
                source,
                message,
                command,
                repositoryPath,
                exitCode,
                Normalize(output),
                Normalize(error),
                isRunning);

            entries.Add(entry);
            if (entries.Count > MaxEntries)
            {
                entries.RemoveRange(0, entries.Count - MaxEntries);
            }

            return entry.Id;
        }
    }

    private static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value
            .Replace('\u001f', ' ')
            .Replace('\u001e', '\n')
            .Trim();
        return normalized.Length <= MaxTextLength
            ? normalized
            : normalized[..MaxTextLength] + $"{Environment.NewLine}... truncated ...";
    }
}
