# The Quiltopia kicker: keeps Claude Code working through tools/kicker/prompt.md, round after round.
#
#   powershell -File tools/kicker/kicker.ps1 status   is it on, is a waiter running, recent activity
#   powershell -File tools/kicker/kicker.ps1 off      stop kicking (and stop a waiting resume)
#   powershell -File tools/kicker/kicker.ps1 on       start kicking again
#   powershell -File tools/kicker/kicker.ps1 start    resume the latest session now, in the background
#
# How it works: a Stop hook hands Claude the prompt every time it finishes (stop-hook.ps1). When a
# turn ends on a usage limit, a StopFailure hook (on-limit.ps1) starts a waiter (the "resume" command
# below) that checks every few minutes and resumes the same session once Claude is available again.

param(
  [Parameter(Position = 0)][ValidateSet('status', 'on', 'off', 'start', 'resume')][string]$Command = 'status',
  [string]$SessionId,
  [string]$Transcript,
  [string]$Reason,
  [switch]$Now
)

. (Join-Path $PSScriptRoot 'common.ps1')

# Errors that mean "try again later" in Claude Code's output.
$LimitPattern = '(?i)rate.?limit|usage limit|limit reached|hit your limit|too many requests|overloaded|credit balance|try again later'

function Stop-Waiter {
  $w = Get-Waiter
  if ($w) { Stop-Process -Id $w.ProcessId -Force -ErrorAction SilentlyContinue; Write-KickerLog ('waiter {0} stopped' -f $w.ProcessId) }
}

# The newest conversation file for this project (Claude Code keeps them under ~/.claude/projects).
function Get-LatestTranscript {
  $key = ($ProjectDir -replace '[^A-Za-z0-9]', '-')
  $dir = Get-ChildItem (Join-Path $env:USERPROFILE '.claude\projects') -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -ieq $key } | Select-Object -First 1
  if (-not $dir) { return $null }
  Get-ChildItem $dir.FullName -Filter '*.jsonl' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

# Runs Claude Code with exactly these arguments (no shell in between: Windows PowerShell mangles
# quotes passed through cmd), feeding it a file as input and saving all it prints. Returns the exit code.
function Invoke-Claude([string]$arguments, [string]$stdinFile, [string]$outFile) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = Get-ClaudeExe
  $psi.Arguments = $arguments
  $psi.WorkingDirectory = $ProjectDir
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.StandardOutputEncoding = [Text.Encoding]::UTF8
  $psi.StandardErrorEncoding = [Text.Encoding]::UTF8
  $p = [System.Diagnostics.Process]::Start($psi)
  $stdout = $p.StandardOutput.ReadToEndAsync()
  $stderr = $p.StandardError.ReadToEndAsync()
  if ($stdinFile) { $bytes = [IO.File]::ReadAllBytes($stdinFile); $p.StandardInput.BaseStream.Write($bytes, 0, $bytes.Length) }
  $p.StandardInput.Close()
  $p.WaitForExit()
  [IO.File]::WriteAllText($outFile, $stdout.Result + $stderr.Result, (New-Object Text.UTF8Encoding($false)))
  return $p.ExitCode
}

# Whether Claude has really replied in this session since $sinceUtc: an answer, not an API error.
# (Other writes to the conversation file, like the editor saving its place, don't count.)
function Test-SessionActive([string]$transcript, [DateTime]$sinceUtc) {
  if (-not $transcript -or -not (Test-Path $transcript)) { return $false }
  $fs = [IO.File]::Open($transcript, 'Open', 'Read', 'ReadWrite')
  try {
    $take = [Math]::Min($fs.Length, 262144)
    $fs.Seek(-$take, 'End') | Out-Null
    $buf = New-Object byte[] $take
    $n = $fs.Read($buf, 0, $take)
  } finally { $fs.Close() }
  foreach ($line in ([Text.Encoding]::UTF8.GetString($buf, 0, $n) -split "`n")) {
    if ($line -notmatch '"type":"assistant"' -or $line -match '"isApiErrorMessage":true') { continue }
    if ($line -match '"timestamp":"([^"]+)"') {
      $t = [DateTime]::Parse($Matches[1], [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AdjustToUniversal)
      if ($t -gt $sinceUtc) { return $true }
    }
  }
  return $false
}

switch ($Command) {
  'status' {
    $cfg = Get-KickerConfig
    'Kicker:            ' + $(if ($cfg.enabled) { 'ON (Claude keeps working when it finishes)' } else { 'OFF' })
    'Resume after limit: ' + $(if ($cfg.resumeAfterLimit) { "yes, checking every $($cfg.retryMinutes) minutes" } else { 'no' })
    $w = Get-Waiter
    'Waiter:            ' + $(if ($w) { "running (process $($w.ProcessId)), waiting to resume" } else { 'not running' })
    if (Test-Path $LogFile) { ''; 'Recent activity:'; Get-Content $LogFile -Tail 12 }
  }
  'on' { Set-KickerEnabled $true; Write-KickerLog 'turned on'; 'Kicker is ON.' }
  'off' { Set-KickerEnabled $false; Stop-Waiter; Write-KickerLog 'turned off'; 'Kicker is OFF. Claude will stop normally after its current turn.' }
  'start' {
    if (Get-Waiter) { 'A waiter is already running.'; break }
    $t = Get-LatestTranscript
    $id = Start-Waiter -sessionId $(if ($t) { $t.BaseName } else { '' }) -transcript $(if ($t) { $t.FullName } else { '' }) -reason 'manual' -now
    Write-KickerLog "waiter $id started by hand"
    "Started (process $id). Follow along in tools/kicker/logs/."
  }
  'resume' {
    # One waiter at a time, even if two limits hit at once.
    $mutex = New-Object System.Threading.Mutex($false, 'Local\QuiltopiaKicker')
    $mine = $false
    try { $mine = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $mine = $true } # a stopped waiter left it
    if (-not $mine) { exit 0 }
    Set-Content -Path $PidFile -Value $PID -Encoding ASCII
    $exe = Get-ClaudeExe
    $cfg = Get-KickerConfig
    $wait = if ($Now) { 0 } elseif ($Reason -in 'overloaded', 'server_error', 'max_output_tokens') { 3 } else { [int]$cfg.retryMinutes }
    $since = (Get-Date).ToUniversalTime()
    Write-KickerLog ("waiting {0} min, then resuming session {1}" -f $wait, $(if ($SessionId) { $SessionId } else { '(latest)' }))
    try {
      while ($true) {
        Start-Sleep -Seconds ($wait * 60)
        $cfg = Get-KickerConfig
        if (-not $cfg.enabled) { Write-KickerLog 'kicker is off; waiter done'; break }
        # Someone picked the session back up (you, in the editor): their hooks keep it going.
        if (Test-SessionActive $Transcript $since) { Write-KickerLog 'Claude is answering in the session again; waiter done'; break }
        # A tiny, unsaved request first, so retries while limited don't clutter the conversation.
        $probe = Join-Path $LogDir 'probe.log'
        $env:QUILT_KICKER_PROBE = '1'
        try { Invoke-Claude '-p --no-session-persistence "Reply with the single word OK."' '' $probe | Out-Null }
        catch { [IO.File]::WriteAllText($probe, 'could not start Claude: ' + $_.Exception.Message) }
        Remove-Item Env:QUILT_KICKER_PROBE
        $p = Get-Content $probe -Raw -ErrorAction SilentlyContinue
        if (-not $p -or $p -match $LimitPattern -or $p -notmatch '\bOK\b') {
          $msg = if ($p) { ($p -replace '\s+', ' ').Trim() } else { 'no answer' }
          Write-KickerLog ('still unavailable: ' + $msg.Substring(0, [Math]::Min(160, $msg.Length)))
          $wait = [int]$cfg.retryMinutes
          continue
        }
        $log = Join-Path $LogDir ('run-{0}.log' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
        $target = if ($SessionId) { "--resume $SessionId" } else { '--continue' }
        Write-KickerLog "resuming ($target), output in $(Split-Path -Leaf $log)"
        $code = Invoke-Claude ("-p $target --permission-mode {0}" -f $cfg.permissionMode) $PromptFile $log
        $since = (Get-Date).ToUniversalTime() # our own run's replies don't count as someone coming back
        $out = Get-Content $log -Raw -ErrorAction SilentlyContinue
        if ($code -ne 0 -and $out -match $LimitPattern) {
          Write-KickerLog 'hit a limit again; waiting'
          $wait = [int]$cfg.retryMinutes
        } else {
          # The run ended on its own (its Stop hook normally keeps it going): pick it straight back up.
          Write-KickerLog "run ended (exit $code); kicking again shortly"
          $wait = 1
        }
      }
    } finally {
      Remove-Item $PidFile -ErrorAction SilentlyContinue
      $mutex.ReleaseMutex()
    }
  }
}
