using ProjectCommitReporter.Core;

namespace ProjectCommitReporter.Tests;

public sealed class GitScannerTests
{
    [Fact]
    public void ParseLogOutput_ParsesGitPrettyFormat()
    {
        var output = "abc123\u001fAndy\u001fandy@example.com\u001f2026-06-29T10:30:00+08:00\u001fadd reporter\u001e";

        var commits = GitScanner.ParseLogOutput(@"C:\repos\Reporter", "main", output);

        var commit = Assert.Single(commits);
        Assert.Equal("Reporter", commit.RepositoryName);
        Assert.Equal("main", commit.Branch);
        Assert.Equal("abc123", commit.Sha);
        Assert.Equal("Andy", commit.AuthorName);
        Assert.Equal("add reporter", commit.Subject);
    }

    [Fact]
    public void ParseLogOutput_ExcludesMergeSubjects()
    {
        var output = string.Join("", [
            "merge1\u001fAndy\u001fandy@example.com\u001f2026-06-29T10:30:00+08:00\u001fMerge branch 'main'\u001e",
            "abc123\u001fAndy\u001fandy@example.com\u001f2026-06-29T10:31:00+08:00\u001fadd reporter\u001e"
        ]);

        var commits = GitScanner.ParseLogOutput(@"C:\repos\Reporter", "main", output);

        var commit = Assert.Single(commits);
        Assert.Equal("abc123", commit.Sha);
    }

    [Fact]
    public void BuildLogArguments_IncludesNoMergesAndAuthor()
    {
        var arguments = GitScanner.BuildLogArguments(
            "origin/main",
            "Andy",
            DateTimeOffset.Parse("2026-06-29T00:00:00+08:00"));

        Assert.Contains("log origin/main --no-merges", arguments);
        Assert.Contains("--author=\"Andy\"", arguments);
    }

    [Fact]
    public async Task ScanAsync_UsesUpstreamRefWhenAvailable()
    {
        var root = CreateRepoRoot(["repo-a"]);
        var repo = Path.Combine(root, "repo-a");
        var runner = new FakeGitCommandRunner();
        runner.Set(repo, "rev-parse --abbrev-ref HEAD", "feature/demo");
        runner.Set(repo, "rev-parse --abbrev-ref --symbolic-full-name @{u}", "origin/feature/demo");
        runner.Set(repo, "fetch --prune", "");
        runner.Set(repo, "log origin/feature/demo", "abc123\u001fAndy\u001fandy@example.com\u001f2026-06-29T10:30:00+08:00\u001fadd reporter\u001e", contains: true);

        try
        {
            var scanner = new GitScanner(runner, new FakeClock(DateTimeOffset.Parse("2026-06-29T12:00:00+08:00")));

            var result = await scanner.ScanAsync(root, "Andy", DateTimeOffset.Parse("2026-06-29T00:00:00+08:00"), CancellationToken.None);

            var status = Assert.Single(result.Status.Repositories);
            Assert.True(status.HasUpstream);
            Assert.Equal("origin/feature/demo", status.ScanRef);
            Assert.Contains(runner.Calls, call => call.RepositoryPath == repo && call.Arguments == "fetch --prune");
            Assert.Contains(runner.Calls, call => call.RepositoryPath == repo && call.Arguments.Contains("log origin/feature/demo --no-merges", StringComparison.Ordinal));
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task ScanAsync_FallsBackToHeadWhenUpstreamIsMissing()
    {
        var root = CreateRepoRoot(["repo-a"]);
        var repo = Path.Combine(root, "repo-a");
        var runner = new FakeGitCommandRunner();
        runner.Set(repo, "rev-parse --abbrev-ref HEAD", "main");
        runner.Set(repo, "rev-parse --abbrev-ref --symbolic-full-name @{u}", "", exitCode: 128);
        runner.Set(repo, "fetch --prune", "");
        runner.Set(repo, "log HEAD", "", contains: true);

        try
        {
            var scanner = new GitScanner(runner, new FakeClock(DateTimeOffset.Parse("2026-06-29T12:00:00+08:00")));

            var result = await scanner.ScanAsync(root, "Andy", DateTimeOffset.Parse("2026-06-29T00:00:00+08:00"), CancellationToken.None);

            var status = Assert.Single(result.Status.Repositories);
            Assert.False(status.HasUpstream);
            Assert.Equal("HEAD", status.ScanRef);
            Assert.Contains(runner.Calls, call => call.RepositoryPath == repo && call.Arguments.Contains("log HEAD --no-merges", StringComparison.Ordinal));
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task ScanAsync_FetchFailureDoesNotStopOtherRepositories()
    {
        var root = CreateRepoRoot(["repo-a", "repo-b"]);
        var repoA = Path.Combine(root, "repo-a");
        var repoB = Path.Combine(root, "repo-b");
        var runner = new FakeGitCommandRunner();
        runner.Set(repoA, "rev-parse --abbrev-ref HEAD", "main");
        runner.Set(repoA, "rev-parse --abbrev-ref --symbolic-full-name @{u}", "origin/main");
        runner.Set(repoA, "fetch --prune", "", "network failed", exitCode: 128);
        runner.Set(repoB, "rev-parse --abbrev-ref HEAD", "main");
        runner.Set(repoB, "rev-parse --abbrev-ref --symbolic-full-name @{u}", "origin/main");
        runner.Set(repoB, "fetch --prune", "");
        runner.Set(repoB, "log origin/main", "abc123\u001fAndy\u001fandy@example.com\u001f2026-06-29T10:30:00+08:00\u001fadd reporter\u001e", contains: true);

        try
        {
            var scanner = new GitScanner(runner, new FakeClock(DateTimeOffset.Parse("2026-06-29T12:00:00+08:00")));

            var result = await scanner.ScanAsync(root, "Andy", DateTimeOffset.Parse("2026-06-29T00:00:00+08:00"), CancellationToken.None);

            Assert.Equal(1, result.Status.SuccessCount);
            Assert.Equal(1, result.Status.FailureCount);
            Assert.Single(result.Commits);
            Assert.Contains(result.Status.Repositories, status => status.RepositoryName == "repo-a" && status.ErrorMessage == "network failed");
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void FindRepositories_FindsGitRootsAndSkipsNestedChildren()
    {
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        var repo = Path.Combine(root, "repo-a");
        var nested = Path.Combine(repo, "child");
        Directory.CreateDirectory(Path.Combine(repo, ".git"));
        Directory.CreateDirectory(Path.Combine(nested, ".git"));

        try
        {
            var repositories = GitScanner.FindRepositories(root);

            var onlyRepo = Assert.Single(repositories);
            Assert.Equal(repo, onlyRepo);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private static string CreateRepoRoot(string[] repoNames)
    {
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        foreach (var repoName in repoNames)
        {
            Directory.CreateDirectory(Path.Combine(root, repoName, ".git"));
        }

        return root;
    }

    private sealed class FakeGitCommandRunner : IGitCommandRunner
    {
        private readonly List<(string RepositoryPath, string Arguments, bool Contains, GitCommandResult Result)> responses = [];

        public List<(string RepositoryPath, string Arguments)> Calls { get; } = [];

        public void Set(string repositoryPath, string arguments, string stdout, string stderr = "", int exitCode = 0, bool contains = false)
        {
            responses.Add((repositoryPath, arguments, contains, new GitCommandResult(exitCode, stdout, stderr)));
        }

        public Task<GitCommandResult> RunAsync(string repositoryPath, string arguments, CancellationToken cancellationToken)
        {
            Calls.Add((repositoryPath, arguments));
            var response = responses.FirstOrDefault(item =>
                string.Equals(item.RepositoryPath, repositoryPath, StringComparison.OrdinalIgnoreCase)
                && (item.Contains
                    ? arguments.Contains(item.Arguments, StringComparison.Ordinal)
                    : string.Equals(item.Arguments, arguments, StringComparison.Ordinal)));

            return Task.FromResult(response.Result ?? new GitCommandResult(0, "", ""));
        }
    }
}
