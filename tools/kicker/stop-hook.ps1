# Claude Code Stop hook: when Claude finishes a task, hand it the next round of tools/kicker/prompt.md
# instead of letting it stop. Wired up in .claude/settings.local.json.
# Turn it off with: powershell -File tools/kicker/kicker.ps1 off   (pressing Esc still interrupts any time)
# Every run leaves a line in tools/kicker/logs/kicker.log saying what it decided and why.

try {
  $ErrorActionPreference = 'Stop'
  . (Join-Path $PSScriptRoot 'common.ps1')
  $hook = $null
  try { $raw = [Console]::In.ReadToEnd(); if ($raw) { $hook = $raw | ConvertFrom-Json } } catch { }
  $session = if ($hook) { $hook.session_id } else { '?' }
  $tasks = if ($hook) { @($hook.background_tasks | Where-Object { $_ }).Count } else { 0 }
  $crons = if ($hook) { @($hook.session_crons | Where-Object { $_ }).Count } else { 0 }

  $cfg = Get-KickerConfig
  if (-not $cfg.enabled) { Write-KickerLog "stop allowed (kicker is off)  session $session"; exit 0 }
  # The waiter's availability check runs Claude too; it must be allowed to stop.
  if ($env:QUILT_KICKER_PROBE) { exit 0 }
  # A scheduled wake-up (a /loop, a timer) means Claude is pausing, not finishing. Background tasks
  # don't count: some (like a watched artifact) last the whole session.
  if ($crons -gt 0) { Write-KickerLog "stop allowed (a scheduled wake-up is pending)  session $session"; exit 0 }

  # A plain .NET string: Get-Content would attach file properties that ConvertTo-Json turns into an object.
  $prompt = [IO.File]::ReadAllText($PromptFile, [Text.Encoding]::UTF8)
  Write-KickerLog "kick  session $session  (background tasks: $tasks)"
  [Console]::Out.Write((@{ decision = 'block'; reason = $prompt } | ConvertTo-Json -Compress))
  exit 0
} catch {
  # Never block on a broken hook; leave a note where it can be found.
  $note = '{0}  stop hook failed: {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $_.Exception.Message
  try { Add-Content -Path (Join-Path $PSScriptRoot 'logs\kicker.log') -Value $note } catch { Add-Content -Path (Join-Path $env:TEMP 'quiltopia-kicker.log') -Value $note }
  exit 0
}
