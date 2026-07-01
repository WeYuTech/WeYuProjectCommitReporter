using ProjectCommitReporter.Core;

namespace ProjectCommitReporter.Tests;

public sealed class SummaryTranslatorTests
{
    [Fact]
    public void Translate_EnglishSummaryToTraditionalChineseAndKeepsFormat()
    {
        var summary = "[DcMateH5Api]\r\n1.fix api lot endpoint";

        var translated = new SummaryTranslator().Translate(summary);

        Assert.Equal($"[DcMateH5Api]{Environment.NewLine}1.修正 API lot endpoint", translated);
    }

    [Fact]
    public void Translate_KnownPhrase()
    {
        var summary = "[HongCheng-Smart-Scheduler]\r\n1.Slim schedule preview workflow";

        var translated = new SummaryTranslator().Translate(summary);

        Assert.Equal($"[HongCheng-Smart-Scheduler]{Environment.NewLine}1.調整排程預覽流程", translated);
    }

    [Fact]
    public void Translate_DoesNotChangeChineseSummary()
    {
        var summary = "[Reporter]\r\n1.調整匯出檔案格式";

        var translated = new SummaryTranslator().Translate(summary);

        Assert.Equal(summary.Replace("\r\n", Environment.NewLine, StringComparison.Ordinal), translated);
    }

    [Fact]
    public void Translate_OnlyTranslatesEnglishNumberedLines()
    {
        var summary = "[Reporter]\r\n1.調整匯出檔案格式\r\n2.add export button";

        var translated = new SummaryTranslator().Translate(summary);

        Assert.Equal($"[Reporter]{Environment.NewLine}1.調整匯出檔案格式{Environment.NewLine}2.新增匯出按鈕", translated);
    }

    [Fact]
    public void Translate_EmptySummaryThrows()
    {
        Assert.Throws<ArgumentException>(() => new SummaryTranslator().Translate(" "));
    }
}
