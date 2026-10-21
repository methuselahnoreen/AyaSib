$o = @()
$o += "=== BRANCH + STATUS ==="
$o += git status -sb
$o += ""
$o += "=== LAST 15 COMMITS ==="
$o += git log -15 --format="%h %ad %an: %s" --date=short
$o += ""
$o += "=== BRANCHES ==="
$o += git branch -a
$o += ""
$o += "=== UNCOMMITTED CHANGES (summary) ==="
$o += git diff --stat
$o += ""
$o += "=== TRACKED FILES ==="
$o += git ls-files
$o += ""
if (Get-Command gh -ErrorAction SilentlyContinue) {
  $o += "=== OPEN ISSUES ==="
  $o += gh issue list --state open --limit 50
  $o += ""
  $o += "=== CLOSED ISSUES ==="
  $o += gh issue list --state closed --limit 30
  $o += ""
  $o += "=== PULL REQUESTS ==="
  $o += gh pr list --state all --limit 20
}
$o | Out-String | Set-Clipboard
Write-Host "Snapshot copied. Paste it into the chat with Ctrl+V."