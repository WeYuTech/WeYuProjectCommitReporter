using System.Text.RegularExpressions;

namespace ProjectCommitReporter.Core;

public sealed class SummaryTranslator
{
    private static readonly (Regex Pattern, string Replacement)[] PhraseRules =
    [
        (new Regex(@"\bslim schedule preview workflow\b", RegexOptions.IgnoreCase), "調整排程預覽流程"),
        (new Regex(@"\bfix api lot endpoint\b", RegexOptions.IgnoreCase), "修正 API lot endpoint"),
        (new Regex(@"\badd export button\b", RegexOptions.IgnoreCase), "新增匯出按鈕"),
        (new Regex(@"\bupdate ui\b", RegexOptions.IgnoreCase), "調整 UI"),
        (new Regex(@"\bui ux\b", RegexOptions.IgnoreCase), "UI/UX"),
        (new Regex(@"\bweb api\b", RegexOptions.IgnoreCase), "WebApi"),
        (new Regex(@"\bwebapi\b", RegexOptions.IgnoreCase), "WebApi")
    ];

    private static readonly (Regex Pattern, string Replacement)[] LeadingVerbRules =
    [
        (new Regex(@"^(fix|fixed|fixes)\b", RegexOptions.IgnoreCase), "修正"),
        (new Regex(@"^(add|added|adds)\b", RegexOptions.IgnoreCase), "新增"),
        (new Regex(@"^(update|updated|updates)\b", RegexOptions.IgnoreCase), "調整"),
        (new Regex(@"^(adjust|adjusted|adjusts)\b", RegexOptions.IgnoreCase), "調整"),
        (new Regex(@"^(change|changed|changes)\b", RegexOptions.IgnoreCase), "調整"),
        (new Regex(@"^(remove|removed|removes)\b", RegexOptions.IgnoreCase), "移除"),
        (new Regex(@"^(delete|deleted|deletes)\b", RegexOptions.IgnoreCase), "刪除"),
        (new Regex(@"^(refactor|refactored|refactors)\b", RegexOptions.IgnoreCase), "重構"),
        (new Regex(@"^(rename|renamed|renames)\b", RegexOptions.IgnoreCase), "重新命名"),
        (new Regex(@"^(implement|implemented|implements)\b", RegexOptions.IgnoreCase), "實作"),
        (new Regex(@"^(create|created|creates)\b", RegexOptions.IgnoreCase), "建立"),
        (new Regex(@"^(improve|improved|improves)\b", RegexOptions.IgnoreCase), "改善"),
        (new Regex(@"^(optimize|optimized|optimizes)\b", RegexOptions.IgnoreCase), "優化")
    ];

    private static readonly (Regex Pattern, string Replacement)[] WordRules =
    [
        (new Regex(@"\bschedule\b", RegexOptions.IgnoreCase), "排程"),
        (new Regex(@"\bpreview\b", RegexOptions.IgnoreCase), "預覽"),
        (new Regex(@"\bworkflow\b", RegexOptions.IgnoreCase), "流程"),
        (new Regex(@"\bbutton\b", RegexOptions.IgnoreCase), "按鈕"),
        (new Regex(@"\bendpoint\b", RegexOptions.IgnoreCase), "endpoint"),
        (new Regex(@"\bapi\b", RegexOptions.IgnoreCase), "API"),
        (new Regex(@"\bsummary\b", RegexOptions.IgnoreCase), "摘要"),
        (new Regex(@"\breport\b", RegexOptions.IgnoreCase), "報表"),
        (new Regex(@"\bexport\b", RegexOptions.IgnoreCase), "匯出"),
        (new Regex(@"\bimport\b", RegexOptions.IgnoreCase), "匯入"),
        (new Regex(@"\bscan\b", RegexOptions.IgnoreCase), "掃描"),
        (new Regex(@"\bfilter\b", RegexOptions.IgnoreCase), "篩選"),
        (new Regex(@"\bstatus\b", RegexOptions.IgnoreCase), "狀態"),
        (new Regex(@"\bproject\b", RegexOptions.IgnoreCase), "專案"),
        (new Regex(@"\bcommit\b", RegexOptions.IgnoreCase), "commit"),
        (new Regex(@"\bmessage\b", RegexOptions.IgnoreCase), "訊息"),
        (new Regex(@"\bloader\b", RegexOptions.IgnoreCase), "Loader")
    ];

    public string Translate(string summary)
    {
        if (string.IsNullOrWhiteSpace(summary))
        {
            throw new ArgumentException("SUMMARY is required.", nameof(summary));
        }

        var lines = summary.Replace("\r\n", "\n", StringComparison.Ordinal).Split('\n');
        var translated = lines.Select(TranslateLine);
        return string.Join(Environment.NewLine, translated);
    }

    private static string TranslateLine(string line)
    {
        var match = Regex.Match(line, @"^(\s*\d+\.\s*)(.+)$");
        if (!match.Success)
        {
            return line;
        }

        var prefix = match.Groups[1].Value;
        var text = match.Groups[2].Value.Trim();
        if (!ContainsAsciiLetter(text) || ContainsCjk(text))
        {
            return line;
        }

        var translated = ApplyRules(text);
        return prefix + translated;
    }

    private static string ApplyRules(string text)
    {
        var result = NormalizeEnglishText(text);

        foreach (var (pattern, replacement) in PhraseRules)
        {
            result = pattern.Replace(result, replacement);
        }

        foreach (var (pattern, replacement) in LeadingVerbRules)
        {
            result = pattern.Replace(result, replacement);
        }

        foreach (var (pattern, replacement) in WordRules)
        {
            result = pattern.Replace(result, replacement);
        }

        return Regex.Replace(result, @"\s+", " ").Trim();
    }

    private static string NormalizeEnglishText(string text)
    {
        var normalized = text
            .Replace("-", " ", StringComparison.Ordinal)
            .Replace("_", " ", StringComparison.Ordinal);
        return Regex.Replace(normalized, @"\s+", " ").Trim();
    }

    private static bool ContainsAsciiLetter(string value)
    {
        return value.Any(character => character is >= 'A' and <= 'Z' or >= 'a' and <= 'z');
    }

    private static bool ContainsCjk(string value)
    {
        return value.Any(character => character is >= '\u4e00' and <= '\u9fff');
    }
}
