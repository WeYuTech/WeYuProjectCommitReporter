using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;

namespace ProjectCommitReporter.Core;

public interface IGitScanner
{
    Task<GitScanResult> ScanAsync(string repoRoot, string authorName, DateTimeOffset since, CancellationToken cancellationToken);
}

public sealed record GitCommandResult(int ExitCode, string StandardOutput, string StandardError);

public interface IGitCommandRunner
{
    Task<GitCommandResult> RunAsync(string repositoryPath, string arguments, CancellationToken cancellationToken);
}

public sealed class ProcessGitCommandRunner(ActivityLogService activityLog) : IGitCommandRunner
{
    public async Task<GitCommandResult> RunAsync(string repositoryPath, string arguments, CancellationToken cancellationToken)
    {
        var commandText = $"git -C \"{repositoryPath}\" {arguments}";
        var logId = activityLog.StartCommand(repositoryPath, commandText);
        try
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = "git",
                Arguments = $"-C \"{repositoryPath}\" {arguments}",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8
            };

            using var process = Process.Start(startInfo);
            if (process is null)
            {
                activityLog.CompleteCommand(logId, -1, "", "Unable to start git.");
                throw new InvalidOperationException("Unable to start git.");
            }

            var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
            var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
            await process.WaitForExitAsync(cancellationToken);

            var stdout = await stdoutTask;
            var stderr = await stderrTask;
            activityLog.CompleteCommand(logId, process.ExitCode, stdout, stderr);
            return new GitCommandResult(process.ExitCode, stdout, stderr);
        }
        catch (Exception ex)
        {
            activityLog.CompleteCommand(logId, -1, "", ex.Message);
            throw;
        }
    }
}

public sealed class GitScanner(IGitCommandRunner runner, IClock clock) : IGitScanner
{
    public async Task<GitScanResult> ScanAsync(string repoRoot, string authorName, DateTimeOffset since, CancellationToken cancellationToken)
    {
        var scanStartedAt = clock.Now;
        if (!Directory.Exists(repoRoot))
        {
            return new GitScanResult([], new ScanStatus { LastScanAt = scanStartedAt });
        }

        var repositories = FindRepositories(repoRoot);
        var commits = new List<GitCommitRecord>();
        var repositoryStatuses = new List<RepositoryScanStatus>();

        foreach (var repository in repositories)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var result = await ReadRepositoryAsync(repository, authorName, since, scanStartedAt, cancellationToken);
            repositoryStatuses.Add(result.Status);
            commits.AddRange(result.Commits);
        }

        var status = new ScanStatus
        {
            LastScanAt = scanStartedAt,
            RepositoryCount = repositoryStatuses.Count,
            SuccessCount = repositoryStatuses.Count(status => status.FetchSucceeded),
            FailureCount = repositoryStatuses.Count(status => !status.FetchSucceeded),
            Repositories = repositoryStatuses
                .OrderBy(status => status.RepositoryName, StringComparer.OrdinalIgnoreCase)
                .ToList()
        };

        return new GitScanResult(
            commits
                .OrderByDescending(commit => commit.CommitTime)
                .ThenBy(commit => commit.RepositoryName)
                .ToList(),
            status);
    }

    public static IReadOnlyList<string> FindRepositories(string repoRoot)
    {
        var result = new List<string>();
        var pending = new Queue<string>();
        pending.Enqueue(Path.GetFullPath(repoRoot));

        while (pending.Count > 0)
        {
            var current = pending.Dequeue();

            if (Directory.Exists(Path.Combine(current, ".git")))
            {
                result.Add(current);
                continue;
            }

            IEnumerable<string> children;
            try
            {
                children = Directory.EnumerateDirectories(current);
            }
            catch (UnauthorizedAccessException)
            {
                continue;
            }
            catch (DirectoryNotFoundException)
            {
                continue;
            }

            foreach (var child in children)
            {
                if (string.Equals(Path.GetFileName(child), ".git", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                pending.Enqueue(child);
            }
        }

        return result.OrderBy(path => path, StringComparer.OrdinalIgnoreCase).ToList();
    }

    public static string BuildLogArguments(string scanRef, string authorName, DateTimeOffset since)
    {
        var sinceText = since.ToString("yyyy-MM-ddTHH:mm:ssK");
        var format = "%H%x1f%an%x1f%ae%x1f%aI%x1f%s%x1e";
        var authorArg = string.IsNullOrWhiteSpace(authorName) ? "" : $" --author=\"{EscapeGitArgument(authorName)}\"";
        return $"log {EscapeGitRef(scanRef)} --no-merges --since=\"{sinceText}\"{authorArg} --date=iso-strict --pretty=format:\"{format}\"";
    }

    public static IReadOnlyList<GitCommitRecord> ParseLogOutput(string repositoryPath, string branch, string output)
    {
        var records = new List<GitCommitRecord>();
        var repositoryName = GetRepositoryName(repositoryPath);

        foreach (var entry in output.Split('\u001e', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = entry.Trim().Split('\u001f');
            if (parts.Length < 5 || !DateTimeOffset.TryParse(parts[3], out var commitTime) || IsMergeSubject(parts[4]))
            {
                continue;
            }

            records.Add(new GitCommitRecord(
                repositoryPath,
                repositoryName,
                branch,
                parts[0],
                parts[1],
                parts[2],
                commitTime,
                parts[4]));
        }

        return records;
    }

    public static bool IsMergeSubject(string subject)
    {
        return Regex.IsMatch(subject.Trim(), @"^(merge branch|merge pull request|merged pr|merge remote-tracking branch)\b", RegexOptions.IgnoreCase);
    }

    private async Task<(IReadOnlyList<GitCommitRecord> Commits, RepositoryScanStatus Status)> ReadRepositoryAsync(
        string repositoryPath,
        string authorName,
        DateTimeOffset since,
        DateTimeOffset scannedAt,
        CancellationToken cancellationToken)
    {
        var repositoryName = GetRepositoryName(repositoryPath);
        var branch = await ReadGitTrimmedOrDefaultAsync(repositoryPath, "rev-parse --abbrev-ref HEAD", "HEAD", cancellationToken);
        var upstream = await ReadGitTrimmedOrDefaultAsync(repositoryPath, "rev-parse --abbrev-ref --symbolic-full-name @{u}", "", cancellationToken);
        var scanRef = string.IsNullOrWhiteSpace(upstream) ? "HEAD" : upstream;

        var status = new RepositoryScanStatus
        {
            RepositoryPath = repositoryPath,
            RepositoryName = repositoryName,
            Branch = branch,
            ScanRef = scanRef,
            HasUpstream = !string.IsNullOrWhiteSpace(upstream),
            ScannedAt = scannedAt
        };

        var fetch = await runner.RunAsync(repositoryPath, "fetch --prune", cancellationToken);
        if (fetch.ExitCode != 0)
        {
            status.FetchSucceeded = false;
            status.ErrorMessage = NormalizeGitError(fetch.StandardError);
            return ([], status);
        }

        var log = await runner.RunAsync(repositoryPath, BuildLogArguments(scanRef, authorName, since), cancellationToken);
        if (log.ExitCode != 0)
        {
            status.FetchSucceeded = false;
            status.ErrorMessage = NormalizeGitError(log.StandardError);
            return ([], status);
        }

        var commits = ParseLogOutput(repositoryPath, scanRef, log.StandardOutput);
        status.FetchSucceeded = true;
        status.CommitCount = commits.Count;
        return (commits, status);
    }

    private async Task<string> ReadGitTrimmedOrDefaultAsync(string repositoryPath, string arguments, string defaultValue, CancellationToken cancellationToken)
    {
        var result = await runner.RunAsync(repositoryPath, arguments, cancellationToken);
        return result.ExitCode == 0 ? result.StandardOutput.Trim() : defaultValue;
    }

    private static string GetRepositoryName(string repositoryPath)
    {
        return Path.GetFileName(repositoryPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));
    }

    private static string NormalizeGitError(string error)
    {
        var normalized = Regex.Replace(error.Trim(), @"\s+", " ");
        return string.IsNullOrWhiteSpace(normalized) ? "git command failed." : normalized;
    }

    private static string EscapeGitArgument(string value)
    {
        return value.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("\"", "\\\"", StringComparison.Ordinal);
    }

    private static string EscapeGitRef(string value)
    {
        return value.Contains(' ', StringComparison.Ordinal) ? $"\"{EscapeGitArgument(value)}\"" : value;
    }
}
