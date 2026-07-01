$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dotnet = & (Join-Path $PSScriptRoot "Resolve-Dotnet.ps1") -Root $root

& $dotnet run --no-launch-profile --project (Join-Path $root "src\ProjectCommitReporter.Web\ProjectCommitReporter.Web.csproj") -- --scan
