using ProjectCommitReporter.Core;

namespace ProjectCommitReporter.Tests;

internal sealed class FakeClock(DateTimeOffset now) : IClock
{
    public DateTimeOffset Now { get; } = now;
    public DateOnly Today => DateOnly.FromDateTime(Now.LocalDateTime);
}
