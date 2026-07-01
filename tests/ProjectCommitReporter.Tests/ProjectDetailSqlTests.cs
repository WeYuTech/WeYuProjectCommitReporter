using ProjectCommitReporter.Core;

namespace ProjectCommitReporter.Tests;

public sealed class ProjectDetailSqlTests
{
    [Fact]
    public void InsertSql_UsesRequiredDefaults()
    {
        Assert.Contains("dbo.GetSid()", ProjectDetailSql.InsertSql);
        Assert.Contains("'1'", ProjectDetailSql.InsertSql);
        Assert.Contains("'autoGenerate'", ProjectDetailSql.InsertSql);
        Assert.Contains("''", ProjectDetailSql.InsertSql);
        Assert.Contains("CONVERT(date, '1900-01-01')", ProjectDetailSql.InsertSql);
        Assert.Contains("SEQ", ProjectDetailSql.InsertSql);
        Assert.Contains("0", ProjectDetailSql.InsertSql);
        Assert.Contains("GETDATE()", ProjectDetailSql.InsertSql);
        Assert.Contains("NULL", ProjectDetailSql.InsertSql);
    }

    [Fact]
    public void CreateParameters_MapsUserEditableAndAuditFields()
    {
        var insert = new ProjectDetailInsert(
            "NEWFAST003",
            "20",
            "[Repo]\n1.Work",
            new DateOnly(2026, 6, 29),
            "Andy",
            "ADMINV2");

        var parameters = ProjectDetailSql.CreateParameters(insert);

        Assert.Equal("NEWFAST003", parameters["@PROJECT_CODE"]);
        Assert.Equal("20", parameters["@PROCESS_TYPE"]);
        Assert.Equal("[Repo]\n1.Work", parameters["@SUMMARY"]);
        Assert.Equal("Andy", parameters["@PRINCIPAL_USER"]);
        Assert.Equal("ADMINV2", parameters["@AUDIT_USER"]);
        Assert.Equal(new DateTime(2026, 6, 29), parameters["@WORK_DATE"]);
    }
}
