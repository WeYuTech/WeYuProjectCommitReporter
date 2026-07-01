param(
    [int]$Port = 5147
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dotnet = & (Join-Path $PSScriptRoot "Resolve-Dotnet.ps1") -Root $root

$env:ASPNETCORE_URLS = "http://127.0.0.1:$Port"
& $dotnet run --no-launch-profile --project (Join-Path $root "src\ProjectCommitReporter.Web\ProjectCommitReporter.Web.csproj")
