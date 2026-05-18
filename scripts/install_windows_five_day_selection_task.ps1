param(
  [string]$TaskName = "TechNewsAutomationFiveDaySelect",
  [string]$At = "09:25",
  [int]$DaysInterval = 5
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $PSScriptRoot "run_five_day_selection_job.ps1"

if (-not (Test-Path -LiteralPath $runner)) {
  throw "Five-day selection runner not found: $runner"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`"" `
  -WorkingDirectory $root

$trigger = New-ScheduledTaskTrigger -Daily -DaysInterval $DaysInterval -At $At
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Run tech-news-automation five-day news selection without relying on Codex Desktop automation turns." `
  -Force | Out-Null

Write-Output "Registered scheduled task: $TaskName"
Write-Output "Schedule: every $DaysInterval day(s) at $At"
Write-Output "Runner: $runner"
