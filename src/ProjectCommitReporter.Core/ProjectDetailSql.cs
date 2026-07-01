namespace ProjectCommitReporter.Core;

public sealed record ProjectDetailInsert(
    string ProjectCode,
    string ProcessType,
    string Summary,
    DateOnly WorkDate,
    string PrincipalUser,
    string AuditUser);

public static class ProjectDetailSql
{
    public const string InsertSql = """
        INSERT INTO dbo.BAS_PROJECT_MAINTAIN_DETAIL
        (
            BAS_PROJECT_MAINTAIN_DETAIL_SID,
            PROJECT_CODE,
            PROCESS_TYPE,
            SUMMARY,
            PROJECT_STATUS,
            COMMENT,
            PRINCIPAL_USER,
            SUPPORT_USER,
            REVIEWER_USER,
            START_EXPECTED_TIME,
            START_TIME,
            EXPECTED_TIME,
            END_TIME,
            SEQ,
            ENABLE_FLAG,
            CREATE_USER,
            CREATE_TIME,
            EDIT_USER,
            EDIT_TIME,
            FILE_NAME
        )
        VALUES
        (
            dbo.GetSid(),
            @PROJECT_CODE,
            @PROCESS_TYPE,
            @SUMMARY,
            '1',
            'autoGenerate',
            @PRINCIPAL_USER,
            '',
            '',
            @WORK_DATE,
            @WORK_DATE,
            CONVERT(date, '1900-01-01'),
            NULL,
            0,
            'Y',
            @AUDIT_USER,
            GETDATE(),
            @AUDIT_USER,
            GETDATE(),
            NULL
        );
        """;

    public static IReadOnlyDictionary<string, object> CreateParameters(ProjectDetailInsert insert)
    {
        return new Dictionary<string, object>
        {
            ["@PROJECT_CODE"] = insert.ProjectCode,
            ["@PROCESS_TYPE"] = insert.ProcessType,
            ["@SUMMARY"] = insert.Summary,
            ["@PRINCIPAL_USER"] = insert.PrincipalUser,
            ["@WORK_DATE"] = insert.WorkDate.ToDateTime(TimeOnly.MinValue),
            ["@AUDIT_USER"] = insert.AuditUser
        };
    }
}
