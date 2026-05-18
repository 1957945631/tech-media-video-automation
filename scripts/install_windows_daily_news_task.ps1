param(
  [string]$TaskName = "TechNewsAutomationDailyCollect",
  [string]$At = "09:05"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $PSScriptRoot "run_daily_news_job.ps1"

if (-not (Test-Path -LiteralPath $runner)) {
  throw "Daily news runner not found: $runner"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`"" `
  -WorkingDirectory $root

$trigger = New-ScheduledTaskTrigger -Daily -At $At
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
  -Description "Run tech-news-automation daily news collection without relying on Codex Desktop automation turns." `
  -Force | Out-Null

Write-Output "Registered scheduled task: $TaskName"
Write-Output "Schedule: daily at $At"
Write-Output "Runner: $runner"
