param(
    [string]$Root
)

$repoDotnet = Join-Path $Root ".dotnet\dotnet.exe"
$userDotnet = Join-Path $env:USERPROFILE ".dotnet\dotnet.exe"

if ($env:PROJECT_REPORTER_DOTNET_EXE) {
    return $env:PROJECT_REPORTER_DOTNET_EXE
}

if (Test-Path $repoDotnet) {
    return $repoDotnet
}

if (Test-Path $userDotnet) {
    return $userDotnet
}

return "dotnet"
