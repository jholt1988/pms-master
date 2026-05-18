param(
  [string]$ApiBase = "http://localhost:3001",
  [string]$Jwt = "",
  [string]$OrgId = "",
  [int]$InvoiceId = 42,
  [string]$LeaseId = "",
  [string]$EsignTemplateId = "",
  [string]$TenantEmail = "tenant@example.com",
  [string]$TenantName = "Tenant One",
  [switch]$SkipProtected
)

$ErrorActionPreference = "Stop"

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
      return Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -ContentType "application/json" -Body $jsonBody
    }
    return Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers
  } catch {
    if ($_.Exception.Response) {
      return $_.Exception.Response
    }
    throw
  }
}

function Print-Response {
  param($resp)
  $status = [int]$resp.StatusCode
  Write-Host "Status: $status"
  try {
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $content = $reader.ReadToEnd()
    if ($content) { Write-Host $content }
  } catch {
    if ($resp.Content) { Write-Host $resp.Content }
  }
}

$protectedHeaders = @{}
if (-not $SkipProtected) {
  if (-not $Jwt) { throw "Jwt is required unless -SkipProtected is used." }
  $protectedHeaders["Authorization"] = "Bearer $Jwt"
  if ($OrgId) { $protectedHeaders["X-Org-Id"] = $OrgId }
}

Write-Step "Stripe webhook negative test (invalid signature)"
$stripeWebhook = Invoke-JsonRequest -Method POST -Url "$ApiBase/webhooks/stripe" -Headers @{ "stripe-signature" = "invalid" } -Body @{
  id   = "evt_test_bad"
  type = "payment_intent.succeeded"
  data = @{ object = @{ id = "pi_test" } }
}
Print-Response $stripeWebhook

Write-Step "QuickBooks webhook negative test (invalid signature)"
$qbWebhook = Invoke-JsonRequest -Method POST -Url "$ApiBase/webhooks/quickbooks" -Headers @{ "intuit-signature" = "invalid" } -Body @{
  eventNotifications = @(
    @{
      realmId = "1234567890"
      dataChangeEvent = @{
        entities = @(
          @{
            name       = "Invoice"
            id         = "1001"
            operation  = "Update"
            lastUpdated = "2026-05-18T00:00:00.000Z"
          }
        )
      }
    }
  )
}
Print-Response $qbWebhook

Write-Step "DocuSign webhook negative test (invalid signature)"
$dsWebhook = Invoke-JsonRequest -Method POST -Url "$ApiBase/webhooks/esignature" -Headers @{ "x-docusign-signature-1" = "invalid" } -Body @{
  event      = "envelope-completed"
  envelopeId = "env_test_1"
}
Print-Response $dsWebhook

if (-not $SkipProtected) {
  Write-Step "QuickBooks auth-url"
  $qbAuth = Invoke-JsonRequest -Method GET -Url "$ApiBase/api/quickbooks/auth-url" -Headers $protectedHeaders -Body $null
  Print-Response $qbAuth

  Write-Step "QuickBooks status"
  $qbStatus = Invoke-JsonRequest -Method GET -Url "$ApiBase/api/quickbooks/status" -Headers $protectedHeaders -Body $null
  Print-Response $qbStatus

  Write-Step "QuickBooks sync"
  $qbSync = Invoke-JsonRequest -Method POST -Url "$ApiBase/api/quickbooks/sync" -Headers $protectedHeaders -Body @{}
  Print-Response $qbSync

  Write-Step "Stripe checkout session creation"
  $stripeCheckout = Invoke-JsonRequest -Method POST -Url "$ApiBase/api/payments/stripe/checkout-session" -Headers $protectedHeaders -Body @{
    invoiceId  = $InvoiceId
    successUrl = "https://example.com/success"
    cancelUrl  = "https://example.com/cancel"
  }
  Print-Response $stripeCheckout

  if ($LeaseId -and $EsignTemplateId) {
    Write-Step "DocuSign envelope creation"
    $esignCreate = Invoke-JsonRequest -Method POST -Url "$ApiBase/api/esignature/leases/$LeaseId/envelopes" -Headers $protectedHeaders -Body @{
      templateId = $EsignTemplateId
      message    = "Please review and sign."
      recipients = @(
        @{
          name  = $TenantName
          email = $TenantEmail
          role  = "tenant"
        }
      )
    }
    Print-Response $esignCreate
  } else {
    Write-Host "`nSkipping DocuSign envelope create (provide -LeaseId and -EsignTemplateId)." -ForegroundColor Yellow
  }
}

Write-Host "`nIntegration smoke run complete." -ForegroundColor Green
