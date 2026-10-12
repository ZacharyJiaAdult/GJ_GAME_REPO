# Shared by the kicker scripts: settings, the log, and finding Claude Code and the waiter.

$KickerDir = $PSScriptRoot
$ProjectDir = (Resolve-Path (Join-Path $KickerDir '..\..')).Path
$LogDir = Join-Path $KickerDir 'logs'
$LogFile = Join-Path $LogDir 'kicker.log'
$PidFile = Join-Path $LogDir 'waiter.pid'
$PromptFile = Join-Path $KickerDir 'prompt.md'

function Get-KickerConfig {
  Get-Content (Join-Path $KickerDir 'kicker.json') -Raw | ConvertFrom-Json
}

function Set-KickerEnabled([bool]$on) {
  $path = Join-Path $KickerDir 'kicker.json'
  $cfg = Get-KickerConfig
  $cfg.enabled = $on
  Set-Content -Path $path -Value ($cfg | ConvertTo-Json) -Encoding ASCII
}

function Write-KickerLog([string]$text) {
  if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
  [IO.File]::AppendAllText($LogFile, ('{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $text) + "`r`n", (New-Object Text.UTF8Encoding($false)))
}

function Get-ClaudeExe {
  $cmd = Get-Command claude -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $local = Join-Path $env:USERPROFILE '.local\bin\claude.exe'
  if (Test-Path $local) { return $local }
  throw 'Claude Code is not installed for the command line (claude.exe not found).'
}

# The waiter that resumes work after a usage limit, if one is running.
function Get-Waiter {
  if (-not (Test-Path $PidFile)) { return $null }
  $id = (Get-Content $PidFile -Raw).Trim()
  if (-not $id) { return $null }
  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$id" -ErrorAction SilentlyContinue
  if ($p -and $p.CommandLine -like '*kicker.ps1*resume*') { return $p }
  return $null
}

# Starts the waiter as its own process, so it outlives the hook or terminal that started it.
function Start-Waiter([string]$sessionId, [string]$transcript, [string]$reason, [switch]$now) {
  $cmd = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" resume' -f (Join-Path $KickerDir 'kicker.ps1')
  if ($sessionId) { $cmd += ' -SessionId "{0}"' -f $sessionId }
  if ($transcript) { $cmd += ' -Transcript "{0}"' -f $transcript }
  if ($reason) { $cmd += ' -Reason "{0}"' -f $reason }
  if ($now) { $cmd += ' -Now' }
  $r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmd; CurrentDirectory = $ProjectDir }
  return $r.ProcessId
}
