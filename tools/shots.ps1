# Takes phone-size screenshots of real play in headless Microsoft Edge (see tools/shots.html).
#   powershell -File tools/shots.ps1            all six sets
#   powershell -File tools/shots.ps1 -Sets 1,2  just those
# Each set is three phones side by side; the PNG paths are printed at the end.

param([string]$Sets = '1,2,3,4,5,6', [string]$OutDir = (Join-Path $env:TEMP 'quiltopia-shots'), [switch]$Night)

$root = Split-Path -Parent $PSScriptRoot
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
if (-not (Test-Path $edge)) { Write-Output 'Microsoft Edge not found.'; exit 2 }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$page = 'file:///' + (Join-Path $root 'tools\shots.html').Replace('\', '/')

foreach ($n in ($Sets -split '[, ]+' | Where-Object { $_ } | ForEach-Object { [int]$_ })) {
  $prof = Join-Path $OutDir "prof-$n"
  Remove-Item -Recurse -Force $prof -ErrorAction SilentlyContinue
  $png = Join-Path $OutDir ("set-$n" + $(if ($Night) { "-night" } else { "" }) + ".png")
  & $edge --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars "--user-data-dir=$prof" --window-size=1214,862 --virtual-time-budget=200000 "--screenshot=$png" "$page`?set=$n$(if ($Night) { "&night=1" })" 2>$null | Out-Null
  if (Test-Path $png) { Write-Output $png } else { Write-Output "set ${n}: no screenshot" }
}
