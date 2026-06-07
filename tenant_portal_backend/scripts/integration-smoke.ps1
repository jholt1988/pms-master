param(
  [string]$ApiBase = "http://127.0.0.1:3001",
  [string]$Jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzQyNzg4NzM4LCJleHAiOjE3NDI4NzUxMzgsInN1YiI6IkV4aXN0aW5nUG9ydGY='",
  [string]$OrgId = "24605e81-552a-45c7-a56d-8c7da631bb15",
  [int]$InvoiceId = 110311,
  [string]$LeaseId = "97e31e36-5b45-4a6f-9b59-35a54582c48a",
  [string]$EsignTemplateId = "22b85027-d844-48fd-a5e9-892b2c8f9d36",
  [string]$TenantEmail = "[EMAIL_ADDRESS]",
  [string]$TenantName = "Tenant One",
  [switch]$SkipProtected
)

$ErrorActionPreference = "Stop"
$script:Failures = New-Object System.Collections.Generic.List[string]
$script:Passes = New-Object System.Collections.Generic.List[string]

function Write-Step($msg) {
  Write-Host "`n=== $msg ===" -ForegroundColor Cyan
}

function Invoke-JsonRequest {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers,
    [object]$Body
  )

  $jsonBody = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 10 } else { $null }
  try {
    if ($null -ne $jsonBody) {
      $r = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -ContentType "application/json" -Body $jsonBody
    } else {
      $r = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers
    }
    return [pscustomobject]@{ StatusCode = [int]$r.StatusCode; Body = $r.Content }
  } catch {
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    $body = $_.ErrorDetails.Message
    return [pscustomobject]@{ StatusCode = $status; Body = $body }
  }
}

function Print-Response($resp) {
  Write-Host "Status: $($resp.StatusCode)"
  if ($resp.Body) { Write-Host $resp.Body }
}

function Assert-Status {
  param(
    [string]$Name,
    [object]$Resp,
    [int[]]$ExpectedStatuses
  )
  if ($ExpectedStatuses -contains [int]$Resp.StatusCode) {
    $script:Passes.Add("$Name => $($Resp.StatusCode)")
  } else {
    $script:Failures.Add("$Name => got $($Resp.StatusCode), expected one of: $($ExpectedStatuses -join ', ')")
  }
}

function Invoke-WebhookWithFallback {
  param(
    [string]$Name,
    [string]$Path,
    [hashtable]$Headers,
    [object]$Body
  )
  $primary = Invoke-JsonRequest -Method POST -Url "$script:WebhookBase$Path" -Headers $Headers -Body $Body
  Print-Response $primary
  $final = $primary
  if ($primary.StatusCode -eq 404) {
    Write-Host "Retrying on /api$Path ..." -ForegroundColor Yellow
    $secondary = Invoke-JsonRequest -Method POST -Url "$script:ApiBase/api$Path" -Headers $Headers -Body $Body
    Print-Response $secondary
    $final = $secondary
  }
  return $final
}

if (-not $SkipProtected) {
  if (-not $Jwt -or $Jwt -like "YOUR_*") {
    throw "Provide a real -Jwt value (not placeholder), or run with -SkipProtected."
  }
  if ($OrgId -like "YOUR_*") {
    throw "Provide a real -OrgId value (not placeholder), or omit -OrgId."
  }
}

$script:ApiBase = $ApiBase.TrimEnd("/")
$script:WebhookBase = if ($script:ApiBase -match "/api$") { $script:ApiBase.Substring(0, $script:ApiBase.Length - 4) } else { $script:ApiBase }

$protectedHeaders = @{ "ngrok-skip-browser-warning" = "true" }
if (-not $SkipProtected) {
  $protectedHeaders["Authorization"] = "Bearer $Jwt"
  if ($OrgId) { $protectedHeaders["X-Org-Id"] = $OrgId }
}

Write-Step "Stripe webhook negative test (invalid signature)"
$stripeWebhook = Invoke-WebhookWithFallback -Name "Stripe" -Path "/webhooks/stripe" -Headers @{
  "stripe-signature" = "invalid"
  "ngrok-skip-browser-warning" = "true"
} -Body @{
  id   = "evt_test_bad"
  type = "payment_intent.succeeded"
  data = @{ object = @{ id = "pi_test" } }
}
Assert-Status -Name "Stripe webhook invalid signature" -Resp $stripeWebhook -ExpectedStatuses @(400, 401)

Write-Step "QuickBooks webhook negative test (invalid signature)"
$qbWebhook = Invoke-WebhookWithFallback -Name "QuickBooks" -Path "/webhooks/quickbooks" -Headers @{
  "intuit-signature" = "invalid"
  "ngrok-skip-browser-warning" = "true"
} -Body @{
  eventNotifications = @(
    @{
      realmId = "1234567890"
      dataChangeEvent = @{
        entities = @(
          @{
            name = "Invoice"; id = "1001"; operation = "Update"; lastUpdated = "2026-05-18T00:00:00.000Z"
          }
        )
      }
    }
  )
}
Assert-Status -Name "QuickBooks webhook invalid signature" -Resp $qbWebhook -ExpectedStatuses @(400, 401)

Write-Step "DocuSign webhook negative test (invalid signature)"
$dsWebhook = Invoke-WebhookWithFallback -Name "DocuSign" -Path "/webhooks/esignature" -Headers @{
  "x-docusign-signature-1" = "invalid"
  "ngrok-skip-browser-warning" = "true"
} -Body @{
  event = "envelope-completed"
  envelopeId = "env_test_1"
}
Assert-Status -Name "DocuSign webhook invalid signature" -Resp $dsWebhook -ExpectedStatuses @(400, 401)

if (-not $SkipProtected) {
  Write-Step "QuickBooks auth-url"
  $qbAuth = Invoke-JsonRequest -Method GET -Url "$script:ApiBase/api/quickbooks/auth-url" -Headers $protectedHeaders -Body $null
  Print-Response $qbAuth
  Assert-Status -Name "QuickBooks auth-url" -Resp $qbAuth -ExpectedStatuses @(200)

  Write-Step "QuickBooks status"
  $qbStatus = Invoke-JsonRequest -Method GET -Url "$script:ApiBase/api/quickbooks/status" -Headers $protectedHeaders -Body $null
  Print-Response $qbStatus
  Assert-Status -Name "QuickBooks status" -Resp $qbStatus -ExpectedStatuses @(200)

  Write-Step "QuickBooks sync"
  $qbSync = Invoke-JsonRequest -Method POST -Url "$script:ApiBase/api/quickbooks/sync" -Headers $protectedHeaders -Body @{}
  Print-Response $qbSync
  Assert-Status -Name "QuickBooks sync" -Resp $qbSync -ExpectedStatuses @(200)

  Write-Step "Stripe checkout session creation"
  $stripeCheckout = Invoke-JsonRequest -Method POST -Url "$script:ApiBase/api/payments/stripe/checkout-session" -Headers $protectedHeaders -Body @{
    invoiceId = $InvoiceId
    successUrl = "https://example.com/success"
    cancelUrl = "https://example.com/cancel"
  }
  Print-Response $stripeCheckout
  Assert-Status -Name "Stripe checkout session" -Resp $stripeCheckout -ExpectedStatuses @(200, 201)

  if ($LeaseId -and $EsignTemplateId) {
    Write-Step "DocuSign envelope creation"
    $esignCreate = Invoke-JsonRequest -Method POST -Url "$script:ApiBase/api/esignature/leases/$LeaseId/envelopes" -Headers $protectedHeaders -Body @{
      templateId = $EsignTemplateId
      message = "Please review and sign."
      recipients = @(@{ name = $TenantName; email = $TenantEmail; role = "tenant" })
    }
    Print-Response $esignCreate
    Assert-Status -Name "DocuSign envelope create" -Resp $esignCreate -ExpectedStatuses @(200, 201)
  } else {
    Write-Host "`nSkipping DocuSign envelope create (provide -LeaseId and -EsignTemplateId)." -ForegroundColor Yellow
  }
}

Write-Host "`nIntegration smoke run complete." -ForegroundColor Green
Write-Host "`n--- Summary ---" -ForegroundColor Cyan
Write-Host "Passes: $($script:Passes.Count)"
$script:Passes | ForEach-Object { Write-Host "  + $_" -ForegroundColor Green }
Write-Host "Failures: $($script:Failures.Count)"
$script:Failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }

if ($script:Failures.Count -gt 0) {
  exit 1
}
