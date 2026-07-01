using System.Text.Json;

namespace ProjectCommitReporter.Core;

public interface IStateStore
{
    Task<ReporterState> LoadAsync(CancellationToken cancellationToken);
    Task SaveAsync(ReporterState state, CancellationToken cancellationToken);
}

public sealed class JsonStateStore(string statePath) : IStateStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    public async Task<ReporterState> LoadAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(statePath))
        {
            return new ReporterState();
        }

        await using var stream = File.OpenRead(statePath);
        return await JsonSerializer.DeserializeAsync<ReporterState>(stream, JsonOptions, cancellationToken)
            ?? new ReporterState();
    }

    public async Task SaveAsync(ReporterState state, CancellationToken cancellationToken)
    {
        var directory = Path.GetDirectoryName(statePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await using var stream = File.Create(statePath);
        await JsonSerializer.SerializeAsync(stream, state, JsonOptions, cancellationToken);
    }
}

public sealed class CandidateStateService(IStateStore store, CandidateFactory factory, IClock clock)
{
    public async Task<CandidateUpsertResult> UpsertCommitsAsync(IReadOnlyList<GitCommitRecord> commits, CancellationToken cancellationToken)
    {
        return await UpsertCommitsAsync(commits, null, cancellationToken);
    }

    public async Task<CandidateUpsertResult> UpsertCommitsAsync(IReadOnlyList<GitCommitRecord> commits, ScanStatus? scanStatus, CancellationToken cancellationToken)
    {
        var state = await store.LoadAsync(cancellationToken);
        var byId = state.Candidates.ToDictionary(candidate => candidate.Id, StringComparer.OrdinalIgnoreCase);
        var added = 0;
        var existing = 0;

        foreach (var commit in commits)
        {
            var id = CandidateFactory.CreateId(commit.RepositoryPath, commit.Sha);
            if (byId.ContainsKey(id))
            {
                existing++;
                continue;
            }

            var candidate = factory.Create(commit);
            state.Candidates.Add(candidate);
            byId[candidate.Id] = candidate;
            added++;
        }

        state.LastScanAt = clock.Now;
        state.LastScanStatus = scanStatus;
        await store.SaveAsync(state, cancellationToken);

        return new CandidateUpsertResult(added, existing, VisibleCandidates(state.Candidates), scanStatus);
    }

    public async Task<IReadOnlyList<CandidateRecord>> ListAsync(CandidateStatus? status, CancellationToken cancellationToken)
    {
        var state = await store.LoadAsync(cancellationToken);
        return VisibleCandidates(state.Candidates)
            .Where(candidate => status is null || candidate.Status == status)
            .OrderByDescending(candidate => candidate.CommitTime)
            .ToList();
    }

    public async Task<ScanStatus?> GetScanStatusAsync(CancellationToken cancellationToken)
    {
        var state = await store.LoadAsync(cancellationToken);
        return state.LastScanStatus;
    }

    public async Task<CandidateRecord> RegenerateSummaryAsync(string id, SummaryGenerator generator, CancellationToken cancellationToken)
    {
        var state = await store.LoadAsync(cancellationToken);
        var candidate = FindCandidate(state, id);
        EnsurePending(candidate);

        var commit = new GitCommitRecord(
            candidate.RepositoryPath,
            candidate.RepositoryName,
            candidate.Branch,
            candidate.Sha,
            candidate.AuthorName,
            candidate.AuthorEmail,
            candidate.CommitTime,
            candidate.Subject);
        var suggestion = generator.Generate(commit);
        candidate.SuggestedProjectCode = suggestion.ProjectCode;
        candidate.SuggestedProcessType = suggestion.ProcessType;
        candidate.Summary = suggestion.Summary;

        await store.SaveAsync(state, cancellationToken);
        return candidate;
    }

    public async Task<CandidateRecord> MarkApprovedAsync(string id, string projectCode, string processType, string summary, CancellationToken cancellationToken)
    {
        var state = await store.LoadAsync(cancellationToken);
        var candidate = FindCandidate(state, id);
        EnsurePending(candidate);

        candidate.ApprovedProjectCode = projectCode;
        candidate.ApprovedProcessType = processType;
        candidate.Summary = summary;
        candidate.Status = CandidateStatus.Approved;
        candidate.ApprovedAt = clock.Now;

        await store.SaveAsync(state, cancellationToken);
        return candidate;
    }

    public async Task<CandidateRecord> MarkSkippedAsync(string id, CancellationToken cancellationToken)
    {
        var state = await store.LoadAsync(cancellationToken);
        var candidate = FindCandidate(state, id);
        EnsurePending(candidate);

        candidate.Status = CandidateStatus.Skipped;
        candidate.SkippedAt = clock.Now;

        await store.SaveAsync(state, cancellationToken);
        return candidate;
    }

    public async Task<CandidateRecord> GetPendingAsync(string id, CancellationToken cancellationToken)
    {
        var state = await store.LoadAsync(cancellationToken);
        var candidate = FindCandidate(state, id);
        EnsurePending(candidate);
        return candidate;
    }

    private static CandidateRecord FindCandidate(ReporterState state, string id)
    {
        return state.Candidates.FirstOrDefault(candidate => string.Equals(candidate.Id, id, StringComparison.OrdinalIgnoreCase))
            ?? throw new KeyNotFoundException($"Candidate {id} was not found.");
    }

    private static IReadOnlyList<CandidateRecord> VisibleCandidates(IReadOnlyList<CandidateRecord> candidates)
    {
        return candidates
            .Where(candidate => !GitScanner.IsMergeSubject(candidate.Subject))
            .ToList();
    }

    private static void EnsurePending(CandidateRecord candidate)
    {
        if (candidate.Status != CandidateStatus.Pending)
        {
            throw new InvalidOperationException($"Candidate {candidate.Id} is already {candidate.Status}.");
        }
    }
}
