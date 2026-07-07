namespace ProjectCommitReporter.Core;

public sealed class ReporterService(
    IReporterConfigService configService,
    IGitScanner scanner,
    CandidateStateService stateService,
    IProjectRepository projectRepository,
    IClock clock,
    ActivityLogService activityLog)
{
    public async Task<CandidateUpsertResult> ScanAsync(CancellationToken cancellationToken)
    {
        var options = configService.GetCurrent();
        var today = clock.Today.ToDateTime(TimeOnly.MinValue);
        var since = new DateTimeOffset(today).AddDays(-Math.Max(0, options.ScanLookbackDays));
        activityLog.Info("scan", $"Scan started. Root={options.RepoRoot}; Author={options.GitAuthorName}; Since={since:yyyy-MM-dd HH:mm:ss zzz}");
        try
        {
            var scan = await scanner.ScanAsync(options.RepoRoot, options.GitAuthorName, since, cancellationToken);
            var result = await stateService.UpsertCommitsAsync(scan.Commits, scan.Status, cancellationToken);
            activityLog.Success("scan", $"Scan completed. Added={result.Added}; Existing={result.Existing}; Repositories={scan.Status.RepositoryCount}; Failures={scan.Status.FailureCount}");
            return result;
        }
        catch (Exception ex)
        {
            activityLog.Error("scan", "Scan failed", ex.Message);
            throw;
        }
    }

    public Task<IReadOnlyList<CandidateRecord>> ListCandidatesAsync(CandidateStatus? status, CancellationToken cancellationToken)
    {
        return stateService.ListAsync(status, cancellationToken);
    }

    public Task<ScanStatus?> GetScanStatusAsync(CancellationToken cancellationToken)
    {
        return stateService.GetScanStatusAsync(cancellationToken);
    }

    public Task<IReadOnlyList<ProjectOption>> GetProjectsAsync(CancellationToken cancellationToken)
    {
        return projectRepository.GetProjectsAsync(cancellationToken);
    }

    public Task<IReadOnlyList<ProcessTypeOption>> GetProcessTypesAsync(CancellationToken cancellationToken)
    {
        return projectRepository.GetProcessTypesAsync(cancellationToken);
    }

    public Task<CandidateRecord> RegenerateSummaryAsync(string id, SummaryGenerator generator, CancellationToken cancellationToken)
    {
        return stateService.RegenerateSummaryAsync(id, generator, cancellationToken);
    }

    public async Task<CandidateRecord> ApproveAsync(string id, ApproveCandidateRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ProjectCode))
        {
            throw new ArgumentException("PROJECT_CODE is required.", nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.ProcessType))
        {
            throw new ArgumentException("PROCESS_TYPE is required.", nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.Summary))
        {
            throw new ArgumentException("SUMMARY is required.", nameof(request));
        }

        var candidate = await stateService.GetPendingAsync(id, cancellationToken);
        var workDate = DateOnly.FromDateTime(candidate.CommitTime.LocalDateTime);
        var options = configService.GetCurrent();

        var insert = new ProjectDetailInsert(
            request.ProjectCode.Trim(),
            request.ProcessType.Trim(),
            request.Summary.Trim(),
            workDate,
            options.PrincipalUser,
            options.AuditUser);

        await projectRepository.InsertProjectDetailAsync(insert, cancellationToken);
        return await stateService.MarkApprovedAsync(id, insert.ProjectCode, insert.ProcessType, insert.Summary, cancellationToken);
    }

    public async Task<ProjectDetailInsert> CreateManualReportAsync(ManualReportRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ProjectCode))
        {
            throw new ArgumentException("PROJECT_CODE is required.", nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.ProcessType))
        {
            throw new ArgumentException("PROCESS_TYPE is required.", nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.Summary))
        {
            throw new ArgumentException("SUMMARY is required.", nameof(request));
        }

        if (request.WorkDate == default)
        {
            throw new ArgumentException("WORK_DATE is required.", nameof(request));
        }

        var options = configService.GetCurrent();
        var insert = new ProjectDetailInsert(
            request.ProjectCode.Trim(),
            request.ProcessType.Trim(),
            request.Summary.Trim(),
            request.WorkDate,
            options.PrincipalUser,
            options.AuditUser);

        await projectRepository.InsertProjectDetailAsync(insert, cancellationToken);
        return insert;
    }

    public Task<CandidateRecord> SkipAsync(string id, CancellationToken cancellationToken)
    {
        return stateService.MarkSkippedAsync(id, cancellationToken);
    }

    public TranslateSummaryResponse TranslateSummary(TranslateSummaryRequest request, SummaryTranslator translator)
    {
        return new TranslateSummaryResponse(translator.Translate(request.Summary));
    }
}
