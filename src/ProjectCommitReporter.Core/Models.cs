namespace ProjectCommitReporter.Core;

public sealed class ReporterOptions
{
    public string RepoRoot { get; set; } = @"C:\Users\rdpuser\RiderProjects";
    public string PrincipalUser { get; set; } = "Andy";
    public string AuditUser { get; set; } = "ADMINV2";
    public string GitAuthorName { get; set; } = "Andy";
    public string GitAuthorEmail { get; set; } = "lol901111@yahoo.com.tw";
    public string StatePath { get; set; } = "data/state.json";
    public string RuntimeConfigPath { get; set; } = "data/runtime-settings.json";
    public string ProtectedConnectionStringPath { get; set; } = "data/connection-string.protected";
    public string? SqlConnectionString { get; set; }
    public int ScanLookbackDays { get; set; }
    public int ScheduleMinutes { get; set; } = 5;

    public string ResolvePath(string contentRoot, string path)
    {
        return Path.IsPathRooted(path) ? path : Path.GetFullPath(Path.Combine(contentRoot, path));
    }
}

public enum CandidateStatus
{
    Pending,
    Approved,
    Skipped
}

public sealed record GitCommitRecord(
    string RepositoryPath,
    string RepositoryName,
    string Branch,
    string Sha,
    string AuthorName,
    string AuthorEmail,
    DateTimeOffset CommitTime,
    string Subject);

public sealed class CandidateRecord
{
    public string Id { get; set; } = "";
    public string RepositoryPath { get; set; } = "";
    public string RepositoryName { get; set; } = "";
    public string Branch { get; set; } = "";
    public string Sha { get; set; } = "";
    public string ShortSha => Sha.Length <= 12 ? Sha : Sha[..12];
    public string AuthorName { get; set; } = "";
    public string AuthorEmail { get; set; } = "";
    public DateTimeOffset CommitTime { get; set; }
    public string Subject { get; set; } = "";
    public string SuggestedProjectCode { get; set; } = "";
    public string SuggestedProcessType { get; set; } = "";
    public string Summary { get; set; } = "";
    public CandidateStatus Status { get; set; } = CandidateStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
    public DateTimeOffset? SkippedAt { get; set; }
    public string? ApprovedProjectCode { get; set; }
    public string? ApprovedProcessType { get; set; }
}

public sealed class ReporterState
{
    public DateTimeOffset? LastScanAt { get; set; }
    public ScanStatus? LastScanStatus { get; set; }
    public List<CandidateRecord> Candidates { get; set; } = [];
}

public sealed class RepositoryScanStatus
{
    public string RepositoryPath { get; set; } = "";
    public string RepositoryName { get; set; } = "";
    public string Branch { get; set; } = "";
    public string ScanRef { get; set; } = "";
    public bool HasUpstream { get; set; }
    public bool FetchSucceeded { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset ScannedAt { get; set; }
    public int CommitCount { get; set; }
}

public sealed class ScanStatus
{
    public DateTimeOffset LastScanAt { get; set; }
    public int RepositoryCount { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<RepositoryScanStatus> Repositories { get; set; } = [];
}

public sealed record GitScanResult(IReadOnlyList<GitCommitRecord> Commits, ScanStatus Status);

public sealed record ProjectOption(string Code, string Name)
{
    public string Key => Code;
    public string Value => Name;
    public string Display => Name;
}

public sealed record ProcessTypeOption(string Code, string Name)
{
    public string Key => Code;
    public string Value => Name;
    public string Display => Name;
}

public sealed record ApproveCandidateRequest(string ProjectCode, string ProcessType, string Summary);

public sealed record ManualReportRequest(string ProjectCode, string ProcessType, string Summary, DateOnly WorkDate);

public sealed record TranslateSummaryRequest(string Summary);

public sealed record TranslateSummaryResponse(string Summary);

public sealed record CandidateUpsertResult(int Added, int Existing, IReadOnlyList<CandidateRecord> Candidates, ScanStatus? ScanStatus = null);

public sealed class RuntimeConfigDocument
{
    public string? RepoRoot { get; set; }
    public string? PrincipalUser { get; set; }
    public string? AuditUser { get; set; }
    public string? GitAuthorName { get; set; }
    public string? GitAuthorEmail { get; set; }
    public int? ScanLookbackDays { get; set; }
    public int? ScheduleMinutes { get; set; }
}

public sealed record UpdateConfigRequest(
    string RepoRoot,
    string PrincipalUser,
    string AuditUser,
    string GitAuthorName,
    string GitAuthorEmail,
    int ScanLookbackDays,
    int ScheduleMinutes);

public sealed record ConfigResponse(
    string RepoRoot,
    string PrincipalUser,
    string AuditUser,
    string GitAuthorName,
    string GitAuthorEmail,
    int ScanLookbackDays,
    int ScheduleMinutes,
    string RuntimeConfigPath,
    string ProtectedConnectionStringPath,
    bool SqlConnectionConfigured,
    ConfigDefaultsResponse Defaults);

public sealed record ConfigDefaultsResponse(
    string RepoRoot,
    string PrincipalUser,
    string AuditUser,
    string GitAuthorName,
    string GitAuthorEmail,
    int ScanLookbackDays,
    int ScheduleMinutes);

public sealed record ScheduledTaskApplyRequest(int ScheduleMinutes);

public sealed record ScheduledTaskApplyResult(bool Succeeded, int ScheduleMinutes, string Message);

public enum ActivityLogLevel
{
    Info,
    Success,
    Warning,
    Error
}

public sealed record ActivityLogEntry(
    long Id,
    DateTimeOffset Timestamp,
    ActivityLogLevel Level,
    string Source,
    string Message,
    string? Command = null,
    string? RepositoryPath = null,
    int? ExitCode = null,
    string? Output = null,
    string? Error = null,
    bool IsRunning = false);

public sealed record ActivityLogResponse(IReadOnlyList<ActivityLogEntry> Entries, int RunningCount);
