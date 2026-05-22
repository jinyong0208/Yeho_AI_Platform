param(
    [string]$PlatformBaseUrl = "http://localhost:8080",
    [string]$AgentBaseUrl = "http://localhost:8000",
    [string]$WebBaseUrl = "http://localhost:5173",
    [string]$TenantCode = "default",
    [string]$Username = "admin",
    [string]$Password = "Admin@123456",
    [string]$GatewayApiKey = "yh_sk_demo_default_key",
    [int]$TimeoutSeconds = 90
)

$ErrorActionPreference = "Stop"

function Wait-JsonEndpoint {
    param(
        [string]$Name,
        [string]$Url
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            return Invoke-RestMethod -Uri $Url -Method Get
        } catch {
            Start-Sleep -Seconds 2
        }
    } while ((Get-Date) -lt $deadline)
    throw "$Name is not ready: $Url"
}

function Wait-WebEndpoint {
    param(
        [string]$Name,
        [string]$Url
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $response
            }
        } catch {
            Start-Sleep -Seconds 2
        }
    } while ((Get-Date) -lt $deadline)
    throw "$Name is not ready: $Url"
}

$platformHealth = Wait-JsonEndpoint -Name "platform" -Url "$PlatformBaseUrl/api/v1/health"
$agentHealth = Wait-JsonEndpoint -Name "agent" -Url "$AgentBaseUrl/api/v1/health"
$web = Wait-WebEndpoint -Name "web" -Url $WebBaseUrl

$loginBody = @{
    tenantCode = $TenantCode
    username = $Username
    password = $Password
} | ConvertTo-Json

$login = Invoke-RestMethod -Uri "$PlatformBaseUrl/api/v1/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $loginBody

$headers = @{
    Authorization = "Bearer $($login.data.accessToken)"
}

$providers = Invoke-RestMethod -Uri "$PlatformBaseUrl/api/v1/providers" -Method Get -Headers $headers
$models = Invoke-RestMethod -Uri "$PlatformBaseUrl/api/v1/models" -Method Get -Headers $headers
$wallet = Invoke-RestMethod -Uri "$PlatformBaseUrl/api/v1/wallets/$($login.data.tenantId)" -Method Get -Headers $headers

$invoiceBody = @{
    tenantId = "$($login.data.tenantId)"
    invoiceTitle = "Default Tenant Ltd."
    taxNo = "91310000SMOKE00001"
    amountCny = "100.00"
    invoiceType = "SPECIAL_VAT"
    email = "finance@example.com"
    remark = "smoke-all invoice"
} | ConvertTo-Json

$invoice = Invoke-RestMethod -Uri "$PlatformBaseUrl/api/v1/invoice-applications" `
    -Method Post `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $invoiceBody

$invoiceIssued = Invoke-RestMethod -Uri "$PlatformBaseUrl/api/v1/invoice-applications/$($invoice.data.id)/issue" `
    -Method Post `
    -Headers $headers `
    -ContentType "application/json" `
    -Body (@{ remark = "smoke-all issued" } | ConvertTo-Json)

$chatBody = @{
    model = "deepseek-chat"
    messages = @(
        @{
            role = "user"
            content = "Phase 6 smoke test"
        }
    )
    temperature = 0.2
    max_tokens = 16
    stream = $false
} | ConvertTo-Json -Depth 10

$chat = Invoke-RestMethod -Uri "$PlatformBaseUrl/v1/chat/completions" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $GatewayApiKey" } `
    -ContentType "application/json" `
    -Body $chatBody

$streamChatBody = @"
{
  "model": "deepseek-chat",
  "messages": [
    {
      "role": "user",
      "content": "Phase stream smoke test"
    }
  ],
  "temperature": 0.2,
  "max_tokens": 16,
  "stream": true
}
"@

$streamChat = Invoke-WebRequest -Uri "$PlatformBaseUrl/v1/chat/completions" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $GatewayApiKey"; Accept = "text/event-stream" } `
    -ContentType "application/json" `
    -Body $streamChatBody `
    -UseBasicParsing

if ($streamChat.Content -notmatch "data: \[DONE\]") {
    throw "stream chat did not return [DONE]"
}

$usageSummary = Invoke-RestMethod -Uri "$PlatformBaseUrl/api/v1/usage-stats/summary" -Method Get -Headers $headers

$pythonAgentBody = @{
    input = "check wallet credits"
    tenantId = "$($login.data.tenantId)"
    userId = "$($login.data.userId)"
} | ConvertTo-Json

$pythonAgent = Invoke-RestMethod -Uri "$AgentBaseUrl/api/v1/agents/demo/run" `
    -Method Post `
    -ContentType "application/json" `
    -Body $pythonAgentBody

$javaAgentBody = @{
    input = "check deepseek model routing"
    context = @{
        source = "smoke-all"
    }
} | ConvertTo-Json -Depth 5

$javaAgent = Invoke-RestMethod -Uri "$PlatformBaseUrl/api/v1/agents/demo/run" `
    -Method Post `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $javaAgentBody

[pscustomobject]@{
    platform = $platformHealth.data.status
    agent = $agentHealth.agent
    webStatus = $web.StatusCode
    loginUser = $login.data.username
    providers = $providers.data.Count
    models = $models.data.Count
    walletBalance = $wallet.data.balanceCredits
    invoiceStatus = $invoiceIssued.data.status
    chatModel = $chat.model
    chatTokens = $chat.usage.total_tokens
    streamDone = $streamChat.Content -match "data: \[DONE\]"
    usageRequests = $usageSummary.data.requestCount
    pythonAgentIntent = $pythonAgent.intent
    javaAgentIntent = $javaAgent.data.intent
    javaAgentRequestId = $javaAgent.data.requestId
} | ConvertTo-Json
