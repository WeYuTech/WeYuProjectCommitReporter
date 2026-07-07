using System.Text.Json;

namespace ProjectCommitReporter.Core;

public interface IReporterConfigService
{
    ReporterOptions GetCurrent();
    ConfigResponse GetResponse();
    ConfigResponse Save(UpdateConfigRequest request);
}

public sealed class RuntimeConfigService(ReporterOptions defaults, string contentRoot) : IReporterConfigService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly object gate = new();
    private ReporterOptions current = Merge(defaults, LoadRuntimeConfig(defaults, contentRoot));

    public ReporterOptions GetCurrent()
    {
        lock (gate)
        {
            return Clone(current);
        }
    }

    public ConfigResponse GetResponse()
    {
        lock (gate)
        {
            return ToResponse(current, defaults, contentRoot);
        }
    }

    public ConfigResponse Save(UpdateConfigRequest request)
    {
        Validate(request);

        lock (gate)
        {
            current = Clone(current);
            current.RepoRoot = request.RepoRoot.Trim();
            current.PrincipalUser = request.PrincipalUser.Trim();
            current.AuditUser = request.AuditUser.Trim();
            current.GitAuthorName = request.GitAuthorName.Trim();
            current.GitAuthorEmail = request.GitAuthorEmail.Trim();
            current.ScanLookbackDays = request.ScanLookbackDays;
            current.ScheduleMinutes = request.ScheduleMinutes;

            var runtime = new RuntimeConfigDocument
            {
                RepoRoot = current.RepoRoot,
                PrincipalUser = current.PrincipalUser,
                AuditUser = current.AuditUser,
                GitAuthorName = current.GitAuthorName,
                GitAuthorEmail = current.GitAuthorEmail,
                ScanLookbackDays = current.ScanLookbackDays,
                ScheduleMinutes = current.ScheduleMinutes
            };

            var path = current.ResolvePath(contentRoot, current.RuntimeConfigPath);
            var directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrWhiteSpace(directory))
            {
                Directory.CreateDirectory(directory);
            }

            File.WriteAllText(path, JsonSerializer.Serialize(runtime, JsonOptions));
            return ToResponse(current, defaults, contentRoot);
        }
    }

    private static RuntimeConfigDocument? LoadRuntimeConfig(ReporterOptions options, string contentRoot)
    {
        var path = options.ResolvePath(contentRoot, options.RuntimeConfigPath);
        if (!File.Exists(path))
        {
            return null;
        }

        using var stream = File.OpenRead(path);
        return JsonSerializer.Deserialize<RuntimeConfigDocument>(stream, JsonOptions);
    }

    private static ReporterOptions Merge(ReporterOptions defaults, RuntimeConfigDocument? runtime)
    {
        var merged = Clone(defaults);
        if (runtime is null)
        {
            return merged;
        }

        merged.RepoRoot = Coalesce(runtime.RepoRoot, merged.RepoRoot);
        merged.PrincipalUser = Coalesce(runtime.PrincipalUser, merged.PrincipalUser);
        merged.AuditUser = Coalesce(runtime.AuditUser, merged.AuditUser);
        merged.GitAuthorName = Coalesce(runtime.GitAuthorName, merged.GitAuthorName);
        merged.GitAuthorEmail = Coalesce(runtime.GitAuthorEmail, merged.GitAuthorEmail);
        merged.ScanLookbackDays = Math.Max(0, runtime.ScanLookbackDays ?? merged.ScanLookbackDays);
        merged.ScheduleMinutes = Math.Max(1, runtime.ScheduleMinutes ?? merged.ScheduleMinutes);
        return merged;
    }

    private static string Coalesce(string? runtimeValue, string defaultValue)
    {
        return string.IsNullOrWhiteSpace(runtimeValue) ? defaultValue : runtimeValue.Trim();
    }

    private static void Validate(UpdateConfigRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RepoRoot))
        {
            throw new ArgumentException("RepoRoot is required.", nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.PrincipalUser))
        {
            throw new ArgumentException("PrincipalUser is required.", nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.AuditUser))
        {
            throw new ArgumentException("AuditUser is required.", nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.GitAuthorName))
        {
            throw new ArgumentException("GitAuthorName is required.", nameof(request));
        }

        if (request.ScanLookbackDays < 0)
        {
            throw new ArgumentException("ScanLookbackDays must be greater than or equal to 0.", nameof(request));
        }

        if (request.ScheduleMinutes < 1)
        {
            throw new ArgumentException("ScheduleMinutes must be greater than or equal to 1.", nameof(request));
        }
    }

    private static ConfigResponse ToResponse(ReporterOptions options, ReporterOptions defaults, string contentRoot)
    {
        var protectedPath = options.ResolvePath(contentRoot, options.ProtectedConnectionStringPath);
        return new ConfigResponse(
            options.RepoRoot,
            options.PrincipalUser,
            options.AuditUser,
            options.GitAuthorName,
            options.GitAuthorEmail,
            options.ScanLookbackDays,
            options.ScheduleMinutes,
            options.ResolvePath(contentRoot, options.RuntimeConfigPath),
            protectedPath,
            IsSqlConnectionConfigured(options, protectedPath),
            new ConfigDefaultsResponse(
                defaults.RepoRoot,
                defaults.PrincipalUser,
                defaults.AuditUser,
                defaults.GitAuthorName,
                defaults.GitAuthorEmail,
                defaults.ScanLookbackDays,
                defaults.ScheduleMinutes));
    }

    private static bool IsSqlConnectionConfigured(ReporterOptions options, string protectedPath)
    {
        return !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PROJECT_REPORTER_SQL_CONNECTION"))
            || !string.IsNullOrWhiteSpace(options.SqlConnectionString)
            || File.Exists(protectedPath);
    }

    private static ReporterOptions Clone(ReporterOptions options)
    {
        return new ReporterOptions
        {
            RepoRoot = options.RepoRoot,
            PrincipalUser = options.PrincipalUser,
            AuditUser = options.AuditUser,
            GitAuthorName = options.GitAuthorName,
            GitAuthorEmail = options.GitAuthorEmail,
            StatePath = options.StatePath,
            RuntimeConfigPath = options.RuntimeConfigPath,
            ProtectedConnectionStringPath = options.ProtectedConnectionStringPath,
            SqlConnectionString = options.SqlConnectionString,
            ScanLookbackDays = options.ScanLookbackDays,
            ScheduleMinutes = options.ScheduleMinutes
        };
    }
}
