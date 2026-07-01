Set shell = CreateObject("WScript.Shell")
scriptPath = Replace(WScript.ScriptFullName, "Scan-Commits-Hidden.vbs", "Scan-Commits.ps1")
command = "powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & scriptPath & """"
shell.Run command, 0, False
