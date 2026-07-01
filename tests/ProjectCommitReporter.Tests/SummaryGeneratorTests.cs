using ProjectCommitReporter.Core;

namespace ProjectCommitReporter.Tests;

public sealed class SummaryGeneratorTests
{
    [Fact]
    public void Generate_UsesRepoNameAndCommitSubject()
    {
        var commit = new GitCommitRecord(
            @"C:\repos\JinZhaoYi-GasCylinder-QC-DataLoader",
            "JinZhaoYi-GasCylinder-QC-DataLoader",
            "main",
            "abc123",
            "Andy",
            "andy@example.com",
            DateTimeOffset.Parse("2026-06-29T09:00:00+08:00"),
            "調整匯出檔案格式");

        var suggestion = new SummaryGenerator().Generate(commit);

        Assert.Equal("NEWFAST003", suggestion.ProjectCode);
        Assert.Equal("20", suggestion.ProcessType);
        Assert.Contains("[JinZhaoYi-GasCylinder-QC-DataLoader]", suggestion.Summary);
        Assert.Contains("1.調整匯出檔案格式", suggestion.Summary);
    }

    [Fact]
    public void Generate_GuessesWebApiModification()
    {
        var commit = new GitCommitRecord(
            @"C:\repos\DcMateH5Api",
            "DcMateH5Api",
            "main",
            "abc123",
            "Andy",
            "andy@example.com",
            DateTimeOffset.Parse("2026-06-29T09:00:00+08:00"),
            "fix api lot endpoint");

        var suggestion = new SummaryGenerator().Generate(commit);

        Assert.Equal("WEYU003", suggestion.ProjectCode);
        Assert.Equal("37", suggestion.ProcessType);
    }
}
