# Runs the rules test, the end-to-end test and the database test in headless Microsoft Edge.
#   powershell -File tools/run-tests.ps1
# Exits with 0 when all three report ALL PASSED. Uses a throwaway browser profile each time.
# The database test loads PGlite (Postgres in WebAssembly) from a CDN, so it needs the internet.

$root = Split-Path -Parent $PSScriptRoot
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
if (-not (Test-Path $edge)) { Write-Output 'Microsoft Edge not found.'; exit 2 }
$work = Join-Path $env:TEMP 'quiltopia-tests'
$failed = 0

foreach ($t in 'rules-test', 'smoke-test', 'sql-test') {
  $prof = Join-Path $work "prof-$t"
  Remove-Item -Recurse -Force $prof -ErrorAction SilentlyContinue
  $url = 'file:///' + (Join-Path $root "tests\$t.html").Replace('\', '/')
  $html = & $edge --headless=new --disable-gpu --allow-file-access-from-files "--user-data-dir=$prof" --virtual-time-budget=600000 --dump-dom $url 2>$null | Out-String
  $parts = $html -split '<pre id="out">'
  if ($parts.Count -lt 2) { Write-Output "== ${t}: did not run"; $failed++; continue }
  $out = [Net.WebUtility]::HtmlDecode(($parts[1] -split '</pre>')[0])
  $lines = $out -split "\r?\n"
  Write-Output "== ${t}: $($lines[0])"
  if ($lines[0].Trim() -ne 'ALL PASSED') {
    $failed++
    $lines | Where-Object { $_ -match '^FAIL|threw|^\s+at ' } | ForEach-Object { Write-Output "   $_" }
  }
}
exit $failed
