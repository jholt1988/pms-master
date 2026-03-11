# Save as: scripts\verify-demo-screenshots.ps1 (run from repo root)
$ErrorActionPreference = "Stop"

$baseDir = "C:\Users\plabr\Dev\pms-master\pms-plans\evidence\screenshots\2026-03-06"
$outReport = "C:\Users\plabr\Dev\pms-master\reports\SCREENSHOT_VERIFICATION_REPORT.md"
$outChecklist = "C:\Users\plabr\Dev\pms-master\reports\SCREENSHOT_CAPTURE_CHECKLIST_POST_P2_AUTOCHECK.md"

$required = @(
  "1_1_empty-dashboard.png",
  "1_2_property-creation-form.png",
  "1_3_property-detail-units.png",
  "2_1_application-form.png",
  "2_2_application-review-pm.png",
  "2_3_tenant-welcome-screen.png",
  "3_1_lease-document-view.png",
  "4_1_payment-method-added.png",
  "4_2_payment-confirmation.png",
  "5_1_maintenance-request-form.png",
  "5_2_pm-queue-view.png",
  "5_3_request-detail-messaging.png",
  "6_1_inspection-type-selector.png",
  "6_2_inspection-checklist.png",
  "6_3_ai-report-routine.png",
  "6_4_ai-report-move-out.png",
  "7_1_owner-dashboard.png",
  "7_2_owner-maintenance-view.png",
  "7_3_owner-comment-badge.png",
  "8_1_mobile-pm-dashboard.png",
  "8_2_mobile-maintenance-form.png",
  "8_3_mobile-inspection-checklist.png",
  "8_4_mobile-owner-request-detail-comment.png"
)

if (!(Test-Path $baseDir)) {
  Write-Host "❌ Screenshot folder not found: $baseDir"
  exit 1
}

$found = @()
$missing = @()

foreach ($file in $required) {
  $full = Join-Path $baseDir $file
  if (Test-Path $full) { $found += $file } else { $missing += $file }
}
$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
$total = $required.Count
$foundCount = $found.Count
$missingCount = $missing.Count
$coverage = [math]::Round(($foundCount / $total) * 100, 1)

# Console summary
Write-Host ""
Write-Host "=== Screenshot Verification ==="
Write-Host "Folder   : $baseDir"
Write-Host "Found    : $foundCount / $total ($coverage`%)"
Write-Host "Missing  : $missingCount"
Write-Host ""
if ($missingCount -gt 0) {
  Write-Host "Missing files:"
  $missing | ForEach-Object { Write-Host " - $_" }
} else {
  Write-Host "✅ All required screenshots are present."
}

# Markdown report
$report = @()
$report += "# Screenshot Verification Report"
$report += ""
$report += "- **Timestamp:** $timestamp"
$report += "- **Folder:** $baseDir"
$report += "- **Found:** $foundCount / $total ($coverage%)"
$report += "- **Missing:** $missingCount"
$report += ""

$report += "## Found"
foreach

 ($f in $found) { $report += "- [x] $f" }

$report += ""
$report += "## Missing"
if ($missingCount -eq 0) {
  $report += "- None 🎉"
} else {
  foreach ($m in $missing) { $report += "- [ ] $m" }
}

$report -join "`r`n" | Set-Content -Path $outReport -Encoding UTF8

# Auto-checked checklist output
$check = @()
$check += "# Screenshot Capture Checklist (Auto-Checked)"
$check += ""
$check += "- Generated: $timestamp"
$check += "- Source folder: $baseDir"
$check += ""

foreach ($f in $required) {
  if ($found -contains $f) {
    $check += "- [x] $f"
  } else {
    $check += "- [ ] $f"
  }
}

$check -join "`r`n" | Set-Content -Path $outChecklist -Encoding UTF8
Write-Host ""
Write-Host "📄 Wrote:"
Write-Host " - $outReport"
Write-Host " - $outChecklist"