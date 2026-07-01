param(
    [string]$TaskName = "ProjectCommitReporter Commit Scan",
    [int]$Minutes = 5
)

$ErrorActionPreference = "Stop"
$script = Join-Path $PSScriptRoot "Scan-Commits-Hidden.vbs"
$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$script`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes $Minutes)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -Hidden

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force
Write-Host "Scheduled task '$TaskName' registered to scan every $Minutes minutes without showing a terminal window."
