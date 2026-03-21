param(
  [string]$TaskName = "Farfield Server"
)

$ErrorActionPreference = "Stop"

$deleteOutput = schtasks.exe /Delete /TN $TaskName /F 2>&1
if ($LASTEXITCODE -ne 0) {
  if ($deleteOutput -match "cannot find the file specified") {
    Write-Host "Scheduled task '$TaskName' does not exist."
    exit 0
  }

  throw ($deleteOutput | Out-String)
}

Write-Host "Removed scheduled task '$TaskName'."
