param(
  [string]$Date = "",
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

$argsList = @("scripts/daily_news_job.mjs")
if ($Date) {
  $argsList += @("--date", $Date)
}
if ($Force) {
  $argsList += "--force"
}

node @argsList
