param(
  [string]$TaskName = "Farfield Server",
  [string]$Agents = "codex",
  [string]$BindHost = "127.0.0.1",
  [int]$Port = 4311,
  [switch]$ExposeViaTailscale = $true,
  [int]$TailscaleHttpsPort = 443
)

$ErrorActionPreference = "Stop"

$scriptPath = (Resolve-Path (Join-Path $PSScriptRoot "windows-start-farfield-server.ps1")).Path
$tailscaleArgument = if ($ExposeViaTailscale) {
  "-ExposeViaTailscale -TailscaleHttpsPort $TailscaleHttpsPort"
} else {
  ""
}

$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`" -Agents `"$Agents`" -BindHost `"$BindHost`" -Port $Port $tailscaleArgument"

schtasks.exe /Create `
  /TN $TaskName `
  /SC ONLOGON `
  /TR $taskCommand `
  /RL LIMITED `
  /F | Out-Null

Write-Host "Registered scheduled task '$TaskName'."
Write-Host "It will start Farfield at logon with agents '$Agents' on http://$BindHost`:$Port."
if ($ExposeViaTailscale) {
  Write-Host "It will also refresh Tailscale HTTPS serve on port $TailscaleHttpsPort."
}
