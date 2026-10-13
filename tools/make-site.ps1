# Builds dist/: just the files players need, ready to drag onto app.netlify.com/drop.
#   powershell -File tools/make-site.ps1
# (A Netlify site connected to GitHub does the same thing itself, from netlify.toml.)
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'dist'
Remove-Item -Recurse -Force $dist -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $dist | Out-Null
foreach ($f in 'index.html', 'privacy.html', 'terms.html', '404.html', 'og-image.png', 'netlify.toml') {
  Copy-Item (Join-Path $root $f) $dist
}
foreach ($d in 'css', 'js') { Copy-Item -Recurse (Join-Path $root $d) (Join-Path $dist $d) }
# Netlify Drop has no build step, so the publish folder is dist/ itself.
(Get-Content (Join-Path $dist 'netlify.toml')) -replace '^\s*command = .*$', '' -replace 'publish = "dist"', 'publish = "."' |
  Set-Content -Encoding utf8 (Join-Path $dist 'netlify.toml')
Write-Output "Ready: $dist  (drag this folder onto https://app.netlify.com/drop)"
