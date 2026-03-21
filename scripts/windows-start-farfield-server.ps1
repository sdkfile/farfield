param(
  [string]$Agents = "codex",
  [string]$BindHost = "127.0.0.1",
  [int]$Port = 4311,
  [switch]$ExposeViaTailscale = $true,
  [int]$TailscaleHttpsPort = 443
)

$ErrorActionPreference = "Stop"

function Resolve-TailscaleExecutable {
  $tailscaleCommand = Get-Command tailscale -ErrorAction SilentlyContinue
  if ($null -ne $tailscaleCommand) {
    return $tailscaleCommand.Source
  }

  $candidatePaths = @(
    "C:\Program Files\Tailscale\tailscale.exe",
    "C:\Program Files (x86)\Tailscale\tailscale.exe"
  )

  foreach ($candidatePath in $candidatePaths) {
    if (Test-Path $candidatePath) {
      return $candidatePath
    }
  }

  return $null
}

function Resolve-CodexExecutable {
  $candidatePaths = @(
    "C:\Users\seong\AppData\Roaming\npm\codex.cmd",
    "C:\Users\seong\AppData\Roaming\npm\codex.exe",
    "C:\Users\seong\AppData\Roaming\npm\codex",
    "C:\Program Files\WindowsApps\OpenAI.Codex_26.313.5234.0_x64__2p2nqsd0c76g0\app\resources\codex"
  )

  foreach ($candidatePath in $candidatePaths) {
    if (Test-Path $candidatePath) {
      return $candidatePath
    }
  }

  $codexCommand = Get-Command codex -ErrorAction SilentlyContinue
  if ($null -ne $codexCommand) {
    return $codexCommand.Source
  }

  return $null
}

function Write-Log {
  param(
    [string]$Message
  )

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "[$timestamp] $Message"
  Write-Host $line
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$bunCommand = Get-Command bun -ErrorAction SilentlyContinue
if ($null -eq $bunCommand) {
  throw "bun is not installed or is not available on PATH."
}

$tsxExecutable = Join-Path $repoRoot "node_modules\.bin\tsx.exe"
if (-not (Test-Path $tsxExecutable)) {
  throw "tsx is not installed. Run 'bun install' in the repo first."
}

$env:HOST = $BindHost
$env:PORT = [string]$Port

$codexExecutable = Resolve-CodexExecutable
if ($null -eq $codexExecutable) {
  throw "Codex executable could not be found on this machine."
}

$env:CODEX_CLI_PATH = $codexExecutable

Write-Log "Starting Farfield server in watch mode..."
Write-Log "Repo: $repoRoot"
Write-Log "Agents: $Agents"
Write-Log "Server URL: http://$BindHost`:$Port"
Write-Log "Codex CLI: $codexExecutable"

if ($ExposeViaTailscale) {
  $tailscaleExecutable = Resolve-TailscaleExecutable
  if ($null -eq $tailscaleExecutable) {
    throw "Tailscale is not installed or is not available on PATH."
  }

  $tailscaleTarget = "http://127.0.0.1:$Port"
  Write-Log "Running: $tailscaleExecutable serve --bg --yes --https=$TailscaleHttpsPort $tailscaleTarget"
  & $tailscaleExecutable "serve" "--bg" "--yes" "--https=$TailscaleHttpsPort" $tailscaleTarget
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  $tailscaleStatusJson = & $tailscaleExecutable "status" "--json" | Out-String
  $tailscaleStatus = $tailscaleStatusJson | ConvertFrom-Json
  $tailscaleDomain = $tailscaleStatus.CertDomains | Select-Object -First 1

  if ([string]::IsNullOrWhiteSpace($tailscaleDomain)) {
    throw "Tailscale HTTPS domain is unavailable."
  }

  Write-Log "Tailscale URL: https://$tailscaleDomain"
}

Write-Log "Running: $($bunCommand.Source) run prepare:workspace-dist"
Set-Location $repoRoot
& $bunCommand.Source "run" "prepare:workspace-dist"
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$serverWorkingDirectory = Join-Path $repoRoot "apps\server"
Write-Log "Running: $tsxExecutable watch src/index.ts --agents=$Agents"
Set-Location $serverWorkingDirectory
& $tsxExecutable "watch" "src/index.ts" "--agents=$Agents"
exit $LASTEXITCODE
