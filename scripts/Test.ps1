$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dotnet = & (Join-Path $PSScriptRoot "Resolve-Dotnet.ps1") -Root $root

& $dotnet test (Join-Path $root "ProjectCommitReporter.sln") --configuration Release
