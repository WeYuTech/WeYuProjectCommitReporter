using Microsoft.Data.SqlClient;

namespace ProjectCommitReporter.Core;

public interface IProjectRepository
{
    Task<IReadOnlyList<ProjectOption>> GetProjectsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<ProcessTypeOption>> GetProcessTypesAsync(CancellationToken cancellationToken);
    Task InsertProjectDetailAsync(ProjectDetailInsert insert, CancellationToken cancellationToken);
}

public sealed class SqlProjectRepository(IConnectionStringProvider connectionStringProvider) : IProjectRepository
{
    public async Task<IReadOnlyList<ProjectOption>> GetProjectsAsync(CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT PROJECT_CODE, PROJECT_NAME
            FROM dbo.V_PROJECT_CODE_LIST_QUERY
            WHERE PROJECT_CODE <> '%%'
            ORDER BY PROJECT_CODE;
            """;

        var result = new List<ProjectOption>();
        await using var connection = new SqlConnection(connectionStringProvider.GetConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var code = reader.GetString(0);
            result.Add(new ProjectOption(code, CleanProjectName(code, reader.GetString(1))));
        }

        return result;
    }

    public async Task<IReadOnlyList<ProcessTypeOption>> GetProcessTypesAsync(CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT CONVERT(nvarchar(50), PROCESS_TYPE), PROCESS_NAME
            FROM dbo.BAS_PROCESS_TYPE
            ORDER BY TRY_CONVERT(int, PROCESS_TYPE), PROCESS_TYPE;
            """;

        var result = new List<ProcessTypeOption>();
        await using var connection = new SqlConnection(connectionStringProvider.GetConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            result.Add(new ProcessTypeOption(reader.GetString(0), reader.GetString(1)));
        }

        return result;
    }

    public async Task InsertProjectDetailAsync(ProjectDetailInsert insert, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionStringProvider.GetConnectionString());
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(ProjectDetailSql.InsertSql, connection);

        foreach (var parameter in ProjectDetailSql.CreateParameters(insert))
        {
            command.Parameters.AddWithValue(parameter.Key, parameter.Value);
        }

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static string CleanProjectName(string code, string name)
    {
        var prefix = $"({code})";
        return name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            ? name[prefix.Length..].Trim()
            : name.Trim();
    }
}
