param(
  [string]$ShortcutName = "Farfield Server"
)

$ErrorActionPreference = "Stop"

$startupFolder = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupFolder "$ShortcutName.lnk"

if (-not (Test-Path $shortcutPath)) {
  Write-Host "Startup shortcut '$shortcutPath' does not exist."
  exit 0
}

Remove-Item $shortcutPath -Force
Write-Host "Removed startup shortcut '$shortcutPath'."
