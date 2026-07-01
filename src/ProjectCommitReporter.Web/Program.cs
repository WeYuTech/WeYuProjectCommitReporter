using ProjectCommitReporter.Core;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

var reporterOptions = builder.Configuration.GetSection("Reporter").Get<ReporterOptions>() ?? new ReporterOptions();
var statePath = reporterOptions.ResolvePath(builder.Environment.ContentRootPath, reporterOptions.StatePath);

builder.Services.AddSingleton(reporterOptions);
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddSingleton<SummaryGenerator>();
builder.Services.AddSingleton<SummaryTranslator>();
builder.Services.AddSingleton<CandidateFactory>();
builder.Services.AddSingleton<IStateStore>(_ => new JsonStateStore(statePath));
builder.Services.AddSingleton<CandidateStateService>();
builder.Services.AddSingleton<IGitCommandRunner, ProcessGitCommandRunner>();
builder.Services.AddSingleton<IGitScanner, GitScanner>();
builder.Services.AddSingleton<IConnectionStringProvider>(_ =>
    new ProtectedConnectionStringProvider(reporterOptions, builder.Environment.ContentRootPath));
builder.Services.AddSingleton<IProjectRepository, SqlProjectRepository>();
builder.Services.AddSingleton<ReporterService>();

var app = builder.Build();

if (args.Any(arg => string.Equals(arg, "--scan", StringComparison.OrdinalIgnoreCase)))
{
    using var scope = app.Services.CreateScope();
    var service = scope.ServiceProvider.GetRequiredService<ReporterService>();
    var result = await service.ScanAsync(CancellationToken.None);
    Console.WriteLine($"Scan complete. Added={result.Added}, Existing={result.Existing}, Total={result.Candidates.Count}");
    return;
}

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapPost("/api/scan", async (ReporterService service, CancellationToken cancellationToken) =>
{
    var result = await service.ScanAsync(cancellationToken);
    return Results.Ok(result);
});

app.MapGet("/api/candidates", async (string? status, ReporterService service, CancellationToken cancellationToken) =>
{
    CandidateStatus? parsedStatus = null;
    if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<CandidateStatus>(status, true, out var value))
    {
        parsedStatus = value;
    }

    return Results.Ok(await service.ListCandidatesAsync(parsedStatus, cancellationToken));
});

app.MapGet("/api/scan-status", async (ReporterService service, CancellationToken cancellationToken) =>
{
    return Results.Ok(await service.GetScanStatusAsync(cancellationToken));
});

app.MapGet("/api/options/projects", async (ReporterService service, CancellationToken cancellationToken) =>
{
    return Results.Ok(await service.GetProjectsAsync(cancellationToken));
});

app.MapGet("/api/options/process-types", async (ReporterService service, CancellationToken cancellationToken) =>
{
    return Results.Ok(await service.GetProcessTypesAsync(cancellationToken));
});

app.MapPost("/api/candidates/{id}/approve", async (
    string id,
    ApproveCandidateRequest request,
    ReporterService service,
    CancellationToken cancellationToken) =>
{
    try
    {
        return Results.Ok(await service.ApproveAsync(id, request, cancellationToken));
    }
    catch (Exception ex) when (ex is ArgumentException or InvalidOperationException or KeyNotFoundException)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapPost("/api/candidates/{id}/skip", async (string id, ReporterService service, CancellationToken cancellationToken) =>
{
    try
    {
        return Results.Ok(await service.SkipAsync(id, cancellationToken));
    }
    catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapPost("/api/manual-report", async (
    ManualReportRequest request,
    ReporterService service,
    CancellationToken cancellationToken) =>
{
    try
    {
        var insert = await service.CreateManualReportAsync(request, cancellationToken);
        return Results.Ok(new
        {
            projectCode = insert.ProjectCode,
            processType = insert.ProcessType,
            summary = insert.Summary,
            workDate = insert.WorkDate
        });
    }
    catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapPost("/api/candidates/{id}/regenerate", async (
    string id,
    ReporterService service,
    SummaryGenerator generator,
    CancellationToken cancellationToken) =>
{
    try
    {
        return Results.Ok(await service.RegenerateSummaryAsync(id, generator, cancellationToken));
    }
    catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapPost("/api/summary/translate", (
    TranslateSummaryRequest request,
    ReporterService service,
    SummaryTranslator translator) =>
{
    try
    {
        return Results.Ok(service.TranslateSummary(request, translator));
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
{
    app.Run("http://127.0.0.1:5147");
}
else
{
    app.Run();
}
