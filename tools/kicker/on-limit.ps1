# Claude Code StopFailure hook: a turn ended on an API error. If waiting can fix it (a usage or
# rate limit, an overloaded server), start the waiter, which resumes this session when Claude is
# available again. Wired up in .claude/settings.local.json.

. (Join-Path $PSScriptRoot 'common.ps1')

$hook = $null
try { $raw = [Console]::In.ReadToEnd(); if ($raw) { $hook = $raw | ConvertFrom-Json } } catch { }
if (-not $hook) { exit 0 }

$cfg = Get-KickerConfig
Write-KickerLog ('stopped by {0}: {1}' -f $hook.error, $hook.error_details)
if (-not $cfg.enabled -or -not $cfg.resumeAfterLimit -or $env:QUILT_KICKER_PROBE) { exit 0 }

# Waiting won't fix these.
$fatal = 'authentication_failed', 'oauth_org_not_allowed', 'account_on_hold', 'invalid_request', 'model_not_found', 'cloud_credential_error'
if ($fatal -contains $hook.error) { exit 0 }
if (Get-Waiter) { exit 0 }

$id = Start-Waiter -sessionId $hook.session_id -transcript $hook.transcript_path -reason $hook.error
Write-KickerLog ('waiter {0} started; it will resume session {1}' -f $id, $hook.session_id)
exit 0
