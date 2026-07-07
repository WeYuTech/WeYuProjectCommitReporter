using System.Diagnostics;
using ProjectCommitReporter.Core;

namespace ProjectCommitReporter.Web;

public sealed class ScheduledTaskService(AppPaths appPaths)
{
    public async Task<ScheduledTaskApplyResult> ApplyAsync(int scheduleMinutes, CancellationToken cancellationToken)
    {
        if (scheduleMinutes < 1)
        {
            throw new ArgumentException("ScheduleMinutes must be greater than or equal to 1.", nameof(scheduleMinutes));
        }

        var scriptPath = Path.GetFullPath(Path.Combine(appPaths.StorageRoot, "scripts", "Install-ScheduledTask.ps1"));
        if (!File.Exists(scriptPath))
        {
            return new ScheduledTaskApplyResult(false, scheduleMinutes, $"Scheduled task script was not found: {scriptPath}");
        }

        var startInfo = new ProcessStartInfo
        {
            FileName = "powershell.exe",
            Arguments = $"-NoProfile -ExecutionPolicy Bypass -File \"{scriptPath}\" -Minutes {scheduleMinutes}",
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };

        using var process = Process.Start(startInfo) ?? throw new InvalidOperationException("Failed to start PowerShell.");
        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
        await process.WaitForExitAsync(cancellationToken);

        var stdout = await stdoutTask;
        var stderr = await stderrTask;
        if (process.ExitCode != 0)
        {
            var message = string.IsNullOrWhiteSpace(stderr) ? stdout : stderr;
            return new ScheduledTaskApplyResult(false, scheduleMinutes, message.Trim());
        }

        return new ScheduledTaskApplyResult(true, scheduleMinutes, stdout.Trim());
    }
}
