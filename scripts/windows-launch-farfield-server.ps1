param(
  [string]$Agents = "codex",
  [string]$BindHost = "127.0.0.1",
  [int]$Port = 4311,
  [switch]$ExposeViaTailscale = $true
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$logsDirectory = Join-Path $repoRoot "logs"
New-Item -ItemType Directory -Force -Path $logsDirectory | Out-Null

$stdoutPath = Join-Path $logsDirectory "farfield-server.out.log"
$stderrPath = Join-Path $logsDirectory "farfield-server.err.log"
$scriptPath = (Resolve-Path (Join-Path $PSScriptRoot "windows-start-farfield-server.ps1")).Path

$tailscaleArgument = if ($ExposeViaTailscale) {
  "-ExposeViaTailscale"
} else {
  ""
}

$argumentList = @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $scriptPath,
  "-Agents",
  $Agents,
  "-BindHost",
  $BindHost,
  "-Port",
  "$Port"
)

if ($tailscaleArgument.Length -gt 0) {
  $argumentList += $tailscaleArgument
}

$process = Start-Process `
  -FilePath "powershell.exe" `
  -ArgumentList $argumentList `
  -WorkingDirectory $repoRoot `
  -RedirectStandardOutput $stdoutPath `
  -RedirectStandardError $stderrPath `
  -WindowStyle Hidden `
  -PassThru

Write-Host "Started Farfield launcher PID $($process.Id)"
Write-Host "stdout: $stdoutPath"
Write-Host "stderr: $stderrPath"
