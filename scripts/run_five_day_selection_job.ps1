param(
  [string]$Date = "",
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

$argsList = @("scripts/five_day_selection_job.mjs")
if ($Date) {
  $argsList += @("--date", $Date)
}
if ($Force) {
  $argsList += "--force"
}

node @argsList
