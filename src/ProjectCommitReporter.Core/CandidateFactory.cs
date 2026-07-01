using System.Security.Cryptography;
using System.Text;

namespace ProjectCommitReporter.Core;

public sealed class CandidateFactory(SummaryGenerator summaryGenerator, IClock clock)
{
    public CandidateRecord Create(GitCommitRecord commit)
    {
        var suggestion = summaryGenerator.Generate(commit);

        return new CandidateRecord
        {
            Id = CreateId(commit.RepositoryPath, commit.Sha),
            RepositoryPath = commit.RepositoryPath,
            RepositoryName = commit.RepositoryName,
            Branch = commit.Branch,
            Sha = commit.Sha,
            AuthorName = commit.AuthorName,
            AuthorEmail = commit.AuthorEmail,
            CommitTime = commit.CommitTime,
            Subject = commit.Subject,
            SuggestedProjectCode = suggestion.ProjectCode,
            SuggestedProcessType = suggestion.ProcessType,
            Summary = suggestion.Summary,
            Status = CandidateStatus.Pending,
            CreatedAt = clock.Now
        };
    }

    public static string CreateId(string repositoryPath, string sha)
    {
        var normalized = $"{Path.GetFullPath(repositoryPath).TrimEnd(Path.DirectorySeparatorChar).ToUpperInvariant()}|{sha}";
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        return Convert.ToHexString(hash)[..24].ToLowerInvariant();
    }
}
