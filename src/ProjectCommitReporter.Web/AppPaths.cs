namespace ProjectCommitReporter.Web;

public sealed record AppPaths(string ContentRoot, string StorageRoot)
{
    public static AppPaths Create(string contentRoot)
    {
        var sourceRoot = Path.GetFullPath(Path.Combine(contentRoot, "..", ".."));
        var looksLikeSourceRoot = File.Exists(Path.Combine(sourceRoot, "ProjectCommitReporter.sln"))
            || Directory.Exists(Path.Combine(sourceRoot, "scripts"));

        return new AppPaths(contentRoot, looksLikeSourceRoot ? sourceRoot : contentRoot);
    }
}
