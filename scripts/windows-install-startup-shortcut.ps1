param(
  [string]$ShortcutName = "Farfield Server",
  [string]$Agents = "codex",
  [string]$BindHost = "127.0.0.1",
  [int]$Port = 4311,
  [switch]$ExposeViaTailscale = $true,
  [int]$TailscaleHttpsPort = 443
)

$ErrorActionPreference = "Stop"

$scriptPath = (Resolve-Path (Join-Path $PSScriptRoot "windows-launch-farfield-server.ps1")).Path
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$startupFolder = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupFolder "$ShortcutName.lnk"
$tailscaleArgument = if ($ExposeViaTailscale) {
  "-ExposeViaTailscale"
} else {
  ""
}

$shortcutArguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`" -Agents `"$Agents`" -BindHost `"$BindHost`" -Port $Port $tailscaleArgument"

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = $shortcutArguments
$shortcut.WorkingDirectory = $repoRoot
$shortcut.WindowStyle = 7
$shortcut.Description = "Starts the Farfield server in watch mode at logon."
$shortcut.Save()

Write-Host "Created startup shortcut at '$shortcutPath'."
