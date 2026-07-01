using ProjectCommitReporter.Core;

namespace ProjectCommitReporter.Tests;

public sealed class OptionContractTests
{
    [Fact]
    public void ProjectOption_UsesCodeAsKeyAndChineseNameAsValue()
    {
        var option = new ProjectOption("NEWFAST003", "金兆益-鋼瓶");

        Assert.Equal("NEWFAST003", option.Key);
        Assert.Equal("金兆益-鋼瓶", option.Value);
        Assert.Equal("金兆益-鋼瓶", option.Display);
    }

    [Fact]
    public void ProcessTypeOption_UsesCodeAsKeyAndChineseNameAsValue()
    {
        var option = new ProcessTypeOption("20", "開發Loader");

        Assert.Equal("20", option.Key);
        Assert.Equal("開發Loader", option.Value);
        Assert.Equal("開發Loader", option.Display);
    }
}
