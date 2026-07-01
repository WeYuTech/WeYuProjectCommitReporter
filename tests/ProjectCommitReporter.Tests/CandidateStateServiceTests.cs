using ProjectCommitReporter.Core;

namespace ProjectCommitReporter.Tests;

public sealed class CandidateStateServiceTests
{
    [Fact]
    public async Task UpsertCommitsAsync_DeduplicatesByRepositoryAndSha()
    {
        var statePath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"), "state.json");
        var clock = new FakeClock(DateTimeOffset.Parse("2026-06-29T12:00:00+08:00"));
        var service = new CandidateStateService(
            new JsonStateStore(statePath),
            new CandidateFactory(new SummaryGenerator(), clock),
            clock);
        var commit = new GitCommitRecord(
            @"C:\repos\DcMateH5Api",
            "DcMateH5Api",
            "main",
            "abc123",
            "Andy",
            "andy@example.com",
            DateTimeOffset.Parse("2026-06-29T09:00:00+08:00"),
            "add api endpoint");

        var first = await service.UpsertCommitsAsync([commit], CancellationToken.None);
        var second = await service.UpsertCommitsAsync([commit], CancellationToken.None);

        Assert.Equal(1, first.Added);
        Assert.Equal(0, first.Existing);
        Assert.Equal(0, second.Added);
        Assert.Equal(1, second.Existing);
        Assert.Single(await service.ListAsync(null, CancellationToken.None));
    }

    [Fact]
    public async Task ListAsync_HidesMergeCandidatesAlreadyInState()
    {
        var statePath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"), "state.json");
        var clock = new FakeClock(DateTimeOffset.Parse("2026-06-29T12:00:00+08:00"));
        var service = new CandidateStateService(
            new JsonStateStore(statePath),
            new CandidateFactory(new SummaryGenerator(), clock),
            clock);
        var normal = new GitCommitRecord(
            @"C:\repos\DcMateH5Api",
            "DcMateH5Api",
            "main",
            "abc123",
            "Andy",
            "andy@example.com",
            DateTimeOffset.Parse("2026-06-29T09:00:00+08:00"),
            "add api endpoint");
        var merge = normal with
        {
            Sha = "def456",
            Subject = "Merge remote-tracking branch 'origin/main'"
        };

        await service.UpsertCommitsAsync([normal, merge], CancellationToken.None);

        var visible = await service.ListAsync(null, CancellationToken.None);

        var candidate = Assert.Single(visible);
        Assert.Equal("abc123", candidate.Sha);
    }
}
