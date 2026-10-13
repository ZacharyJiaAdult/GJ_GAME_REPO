# Makes og-image.png (1200x630), the picture shown when a Quiltopia link is shared.
#   powershell -File tools/og-image.ps1
$root = Split-Path -Parent $PSScriptRoot
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
$prof = Join-Path $env:TEMP 'quiltopia-og'
Remove-Item -Recurse -Force $prof -ErrorAction SilentlyContinue
$page = 'file:///' + (Join-Path $root 'tools\og-image.html').Replace('\', '/')
$png = Join-Path $root 'og-image.png'
& $edge --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars "--user-data-dir=$prof" --window-size=1200,630 --virtual-time-budget=120000 "--screenshot=$png" $page 2>$null | Out-Null
if (Test-Path $png) { Write-Output $png } else { Write-Output 'No picture made.'; exit 1 }
