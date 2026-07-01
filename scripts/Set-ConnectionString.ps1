param(
    [Parameter(Mandatory = $true)]
    [string]$ConnectionString
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root "data\connection-string.protected"
$targetDir = Split-Path -Parent $target

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Add-Type -AssemblyName System.Security

$plainBytes = [System.Text.Encoding]::UTF8.GetBytes($ConnectionString)
$protectedBytes = [System.Security.Cryptography.ProtectedData]::Protect(
    $plainBytes,
    $null,
    [System.Security.Cryptography.DataProtectionScope]::CurrentUser)

[System.IO.File]::WriteAllText($target, [Convert]::ToBase64String($protectedBytes))
Write-Host "Protected connection string written to $target"
