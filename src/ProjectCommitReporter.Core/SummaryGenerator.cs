using System.Text.RegularExpressions;

namespace ProjectCommitReporter.Core;

public sealed record SummarySuggestion(string ProjectCode, string ProcessType, string Summary);

public sealed class SummaryGenerator
{
    public SummarySuggestion Generate(GitCommitRecord commit)
    {
        var projectCode = GuessProjectCode(commit.RepositoryName, commit.Subject);
        var processType = GuessProcessType(commit.RepositoryName, commit.Subject);
        var summary = $"[{commit.RepositoryName}]{Environment.NewLine}1.{NormalizeSubject(commit.Subject)}";

        return new SummarySuggestion(projectCode, processType, summary);
    }

    private static string GuessProjectCode(string repositoryName, string subject)
    {
        var text = $"{repositoryName} {subject}";

        if (ContainsAny(text, "JinZhaoYi", "GasCylinder", "GasQc", "NEWFAST"))
        {
            return "NEWFAST003";
        }

        if (ContainsAny(text, "DcMateH5Api", "DCMate"))
        {
            return "WEYU003";
        }

        if (ContainsAny(text, "Kaosu", "KSS", "TH_KAOSU"))
        {
            return "TH_KAOSU001";
        }

        return "";
    }

    private static string GuessProcessType(string repositoryName, string subject)
    {
        var text = $"{repositoryName} {subject}";

        if (ContainsAny(text, "sql", "tvf", "function", "stored procedure"))
        {
            return "71";
        }

        if (ContainsAny(text, "api", "controller", "endpoint", "webapi"))
        {
            return ContainsAny(text, "fix", "修正", "調整", "update") ? "37" : "36";
        }

        if (ContainsAny(text, "ui", "ux", "css", "html", "畫面", "樣式"))
        {
            return "7";
        }

        if (ContainsAny(text, "loader", "import", "export", "匯入", "匯出", "轉檔"))
        {
            return ContainsAny(text, "fix", "修正", "bug") ? "22" : "20";
        }

        return "20";
    }

    private static bool ContainsAny(string value, params string[] needles)
    {
        return needles.Any(needle => value.Contains(needle, StringComparison.OrdinalIgnoreCase));
    }

    private static string NormalizeSubject(string subject)
    {
        var normalized = Regex.Replace(subject.Trim(), @"\s+", " ");
        return string.IsNullOrWhiteSpace(normalized) ? "整理專案 commit" : normalized;
    }
}
