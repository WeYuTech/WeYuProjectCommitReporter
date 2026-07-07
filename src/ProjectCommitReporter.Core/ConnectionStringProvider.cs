using System.Security.Cryptography;
using System.Text;
using System.Runtime.Versioning;

namespace ProjectCommitReporter.Core;

public interface IConnectionStringProvider
{
    string GetConnectionString();
}

public sealed class ProtectedConnectionStringProvider(IReporterConfigService configService, string contentRoot) : IConnectionStringProvider
{
    [SupportedOSPlatform("windows")]
    public string GetConnectionString()
    {
        var environmentValue = Environment.GetEnvironmentVariable("PROJECT_REPORTER_SQL_CONNECTION");
        if (!string.IsNullOrWhiteSpace(environmentValue))
        {
            return environmentValue;
        }

        var options = configService.GetCurrent();
        if (!string.IsNullOrWhiteSpace(options.SqlConnectionString))
        {
            return options.SqlConnectionString;
        }

        var protectedPath = options.ResolvePath(contentRoot, options.ProtectedConnectionStringPath);
        if (!File.Exists(protectedPath))
        {
            throw new InvalidOperationException(
                $"SQL connection string is not configured. Set PROJECT_REPORTER_SQL_CONNECTION or run scripts\\Set-ConnectionString.ps1 to create {protectedPath}.");
        }

        var protectedBytes = Convert.FromBase64String(File.ReadAllText(protectedPath).Trim());
        var plainBytes = ProtectedData.Unprotect(protectedBytes, null, DataProtectionScope.CurrentUser);
        return Encoding.UTF8.GetString(plainBytes);
    }

    [SupportedOSPlatform("windows")]
    public static void ProtectToFile(string connectionString, string protectedPath)
    {
        var directory = Path.GetDirectoryName(protectedPath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var plainBytes = Encoding.UTF8.GetBytes(connectionString);
        var protectedBytes = ProtectedData.Protect(plainBytes, null, DataProtectionScope.CurrentUser);
        File.WriteAllText(protectedPath, Convert.ToBase64String(protectedBytes));
    }
}
