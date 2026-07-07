using System.Text.Json;
using ProjectCommitReporter.Core;

namespace ProjectCommitReporter.Tests;

public sealed class RuntimeConfigServiceTests
{
    [Fact]
    public void GetCurrent_UsesDefaultsWhenRuntimeConfigDoesNotExist()
    {
        var contentRoot = CreateTempDirectory();
        var defaults = CreateDefaults();
        var service = new RuntimeConfigService(defaults, contentRoot);

        var current = service.GetCurrent();

        Assert.Equal(defaults.RepoRoot, current.RepoRoot);
        Assert.Equal(defaults.GitAuthorName, current.GitAuthorName);
        Assert.Equal(defaults.ScheduleMinutes, current.ScheduleMinutes);
    }

    [Fact]
    public void GetCurrent_OverlaysRuntimeConfigWhenFileExists()
    {
        var contentRoot = CreateTempDirectory();
        Directory.CreateDirectory(Path.Combine(contentRoot, "data"));
        File.WriteAllText(
            Path.Combine(contentRoot, "data", "runtime-settings.json"),
            """
            {
              "repoRoot": "D:\\Repos",
              "gitAuthorName": "Andy",
              "gitAuthorEmail": "andy@example.com",
              "scanLookbackDays": 2,
              "scheduleMinutes": 10
            }
            """);
        var service = new RuntimeConfigService(CreateDefaults(), contentRoot);

        var current = service.GetCurrent();

        Assert.Equal(@"D:\Repos", current.RepoRoot);
        Assert.Equal("Andy", current.GitAuthorName);
        Assert.Equal("andy@example.com", current.GitAuthorEmail);
        Assert.Equal(2, current.ScanLookbackDays);
        Assert.Equal(10, current.ScheduleMinutes);
    }

    [Theory]
    [InlineData("", "Andy", "ADMINV2", "Andy", "andy@example.com", 0, 5)]
    [InlineData("C:\\Repos", "Andy", "ADMINV2", "Andy", "andy@example.com", -1, 5)]
    [InlineData("C:\\Repos", "Andy", "ADMINV2", "Andy", "andy@example.com", 0, 0)]
    public void Save_RejectsInvalidValues(
        string repoRoot,
        string principalUser,
        string auditUser,
        string gitAuthorName,
        string gitAuthorEmail,
        int scanLookbackDays,
        int scheduleMinutes)
    {
        var service = new RuntimeConfigService(CreateDefaults(), CreateTempDirectory());
        var request = new UpdateConfigRequest(
            repoRoot,
            principalUser,
            auditUser,
            gitAuthorName,
            gitAuthorEmail,
            scanLookbackDays,
            scheduleMinutes);

        Assert.Throws<ArgumentException>(() => service.Save(request));
    }

    [Fact]
    public void GetResponse_DoesNotExposeSqlConnectionString()
    {
        var defaults = CreateDefaults();
        defaults.SqlConnectionString = "Data Source=server;Password=secret;";
        var service = new RuntimeConfigService(defaults, CreateTempDirectory());

        var json = JsonSerializer.Serialize(service.GetResponse(), new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.DoesNotContain("Password=secret", json);
        Assert.DoesNotContain("SqlConnectionString", json);
    }

    private static ReporterOptions CreateDefaults()
    {
        return new ReporterOptions
        {
            RepoRoot = @"C:\Users\rdpuser\RiderProjects",
            PrincipalUser = "Andy",
            AuditUser = "ADMINV2",
            GitAuthorName = "Andy",
            GitAuthorEmail = "lol901111@yahoo.com.tw",
            StatePath = "data/state.json",
            RuntimeConfigPath = "data/runtime-settings.json",
            ProtectedConnectionStringPath = "data/connection-string.protected",
            ScanLookbackDays = 0,
            ScheduleMinutes = 5
        };
    }

    private static string CreateTempDirectory()
    {
        var path = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(path);
        return path;
    }
}
