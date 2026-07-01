namespace ProjectCommitReporter.Core;

public interface IClock
{
    DateTimeOffset Now { get; }
    DateOnly Today { get; }
}

public sealed class SystemClock : IClock
{
    public DateTimeOffset Now => DateTimeOffset.Now;
    public DateOnly Today => DateOnly.FromDateTime(DateTime.Now);
}
