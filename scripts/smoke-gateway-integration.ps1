param(
    [string]$PlatformBaseUrl = "http://localhost:8080",
    [string]$TenantCode = "default",
    [string]$Username = "admin",
    [string]$Password = "Admin@123456",
    [string]$MockProviderBaseUrl = "",
    [int]$TimeoutSeconds = 90
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )
    if (-not $Condition) {
        throw $Message
    }
}

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

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )
    if ($null -eq $Body) {
        return Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers
    }
    return Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 12)
}

function Invoke-RawHttp {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )
    $client = [System.Net.Http.HttpClient]::new()
    try {
        $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new($Method), $Url)
        foreach ($key in $Headers.Keys) {
            [void]$request.Headers.TryAddWithoutValidation($key, [string]$Headers[$key])
        }
        if ($null -ne $Body) {
            $payload = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 12 }
            $request.Content = [System.Net.Http.StringContent]::new([string]$payload, [System.Text.Encoding]::UTF8, "application/json")
        }
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        $content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        return [pscustomobject]@{
            StatusCode = [int]$response.StatusCode
            Headers = $response.Headers
            Content = $content
        }
    } finally {
        $client.Dispose()
    }
}

function Assert-OpenAiError {
    param(
        [object]$Response,
        [int]$ExpectedStatus,
        [string]$ExpectedCode
    )
    Assert-True ($Response.StatusCode -eq $ExpectedStatus) "Expected HTTP $ExpectedStatus, got $($Response.StatusCode): $($Response.Content)"
    Assert-True ($Response.Headers.Contains("X-Request-Id")) "OpenAI-compatible error missing X-Request-Id"
    $json = $Response.Content | ConvertFrom-Json
    Assert-True ($null -ne $json.error) "Missing OpenAI-compatible error envelope"
    if (-not [string]::IsNullOrWhiteSpace($ExpectedCode)) {
        Assert-True ([string]$json.error.code -eq $ExpectedCode) "Expected error code $ExpectedCode, got $($json.error.code)"
    }
    return $json
}

function Get-HeaderValue {
    param(
        [object]$Headers,
        [string]$Name
    )
    if (-not $Headers.Contains($Name)) {
        return $null
    }
    return $Headers.GetValues($Name) | Select-Object -First 1
}

function Find-UsageLog {
    param(
        [hashtable]$Headers,
        [long]$TenantId,
        [long]$ApiKeyId,
        [string]$RequestId,
        [string]$ModelCode
    )
    $logs = Invoke-Api -Method Get -Url "$PlatformBaseUrl/api/v1/usage-logs?tenantId=$TenantId&apiKeyId=$ApiKeyId&limit=50" -Headers $Headers
    $matches = @($logs.data) | Where-Object {
        $_.requestId -eq $RequestId -and $_.modelCode -eq $ModelCode
    }
    return $matches | Select-Object -First 1
}

function Configure-MockProvider {
    param(
        [hashtable]$Headers,
        [string]$ProviderCode,
        [string]$BaseUrl
    )
    $providers = Invoke-Api -Method Get -Url "$PlatformBaseUrl/api/v1/providers" -Headers $Headers
    $provider = @($providers.data) | Where-Object { $_.providerCode -eq $ProviderCode } | Select-Object -First 1
    Assert-True ($null -ne $provider) "Provider not found: $ProviderCode"
    Invoke-Api -Method Put -Url "$PlatformBaseUrl/api/v1/providers/$($provider.id)" -Headers $Headers -Body @{
        providerName = $provider.providerName
        baseUrl = $BaseUrl
        status = "ACTIVE"
        timeoutMs = 120000
        retryCount = 0
        circuitFailureThreshold = 5
        circuitCooldownSeconds = 60
    } | Out-Null
    $probe = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/providers/$($provider.id)/test" -Headers $Headers
    Assert-True ([bool]$probe.success) "Mock provider probe failed for ${ProviderCode}: $($probe.errorCode) $($probe.errorMessage)"
    return $provider
}

$createdApiKeyIds = New-Object System.Collections.Generic.List[long]

try {
    if ([string]::IsNullOrWhiteSpace($MockProviderBaseUrl)) {
        $MockProviderBaseUrl = "$PlatformBaseUrl/mock-provider/v1"
    }
    [void](Wait-JsonEndpoint -Name "platform" -Url "$PlatformBaseUrl/api/v1/health")

    $login = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/auth/login" -Body @{
        tenantCode = $TenantCode
        username = $Username
        password = $Password
    }
    $tenantId = [long]$login.data.tenantId
    $adminHeaders = @{ Authorization = "Bearer $($login.data.accessToken)" }
    $suffix = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()

    [void](Configure-MockProvider -Headers $adminHeaders -ProviderCode "DEEPSEEK" -BaseUrl $MockProviderBaseUrl)
    [void](Configure-MockProvider -Headers $adminHeaders -ProviderCode "QWEN" -BaseUrl $MockProviderBaseUrl)

    $gatewayKey = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys" -Headers $adminHeaders -Body @{
        name = "gateway-integration-$suffix"
        scopes = @("chat:completion", "embedding:create", "models:read", "usage:read")
    }
    $gatewayApiKeyId = [long]$gatewayKey.data.id
    $createdApiKeyIds.Add($gatewayApiKeyId)
    $gatewayApiKey = [string]$gatewayKey.data.apiKey

    $walletBefore = Invoke-Api -Method Get -Url "$PlatformBaseUrl/api/v1/wallets/$tenantId" -Headers $adminHeaders
    $chatRequestId = "smoke-chat-$suffix"
    $chat = Invoke-RawHttp -Method Post -Url "$PlatformBaseUrl/v1/chat/completions" -Headers @{
        Authorization = "Bearer $gatewayApiKey"
        "X-Request-Id" = $chatRequestId
    } -Body @{
        model = "deepseek-chat"
        messages = @(@{ role = "user"; content = "gateway integration chat success" })
        temperature = 0.2
        max_tokens = 16
        stream = $false
    }
    Assert-True ($chat.StatusCode -eq 200) "chat/completions expected 200, got $($chat.StatusCode): $($chat.Content)"
    Assert-True ((Get-HeaderValue -Headers $chat.Headers -Name "X-Request-Id") -eq $chatRequestId) "chat/completions did not echo X-Request-Id"
    $chatJson = $chat.Content | ConvertFrom-Json
    Assert-True ($chatJson.model -eq "deepseek-chat") "chat response model mismatch"
    Assert-True ([int]$chatJson.usage.total_tokens -gt 0) "chat response missing usage tokens"
    $chatUsage = Find-UsageLog -Headers $adminHeaders -TenantId $tenantId -ApiKeyId $gatewayApiKeyId -RequestId $chatRequestId -ModelCode "deepseek-chat"
    Assert-True ($null -ne $chatUsage) "chat usage log not found by request_id"
    Assert-True ([bool]$chatUsage.success) "chat usage log is not success=true"
    Assert-True ([long]$chatUsage.chargeCredits -gt 0) "chat usage log did not record charge credits"

    $walletAfterChat = Invoke-Api -Method Get -Url "$PlatformBaseUrl/api/v1/wallets/$tenantId" -Headers $adminHeaders
    Assert-True ([long]$walletAfterChat.data.balanceCredits -lt [long]$walletBefore.data.balanceCredits) "wallet balance did not decrease after chat"
    Assert-True ([long]$walletAfterChat.data.totalUsedCredits -gt [long]$walletBefore.data.totalUsedCredits) "wallet total used did not increase after chat"

    $walletLogs = Invoke-Api -Method Get -Url "$PlatformBaseUrl/api/v1/wallets/$tenantId/logs?limit=200" -Headers $adminHeaders
    $settleLog = @($walletLogs.data) | Where-Object { $_.bizId -eq $chatRequestId -and $_.direction -eq "SETTLE" } | Select-Object -First 1
    Assert-True ($null -ne $settleLog) "wallet SETTLE log not found by request_id"

    $modelsOnlyKey = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys" -Headers $adminHeaders -Body @{
        name = "gateway-integration-models-only-$suffix"
        scopes = @("models:read")
    }
    $modelsOnlyApiKeyId = [long]$modelsOnlyKey.data.id
    $createdApiKeyIds.Add($modelsOnlyApiKeyId)
    $embeddingDenied = Invoke-RawHttp -Method Post -Url "$PlatformBaseUrl/v1/embeddings" -Headers @{
        Authorization = "Bearer $($modelsOnlyKey.data.apiKey)"
        "X-Request-Id" = "smoke-embedding-denied-$suffix"
    } -Body @{
        model = "text-embedding-v4"
        input = "scope denied"
    }
    [void](Assert-OpenAiError -Response $embeddingDenied -ExpectedStatus 403 -ExpectedCode "403")

    $embeddingRequestId = "smoke-embedding-$suffix"
    $embedding = Invoke-RawHttp -Method Post -Url "$PlatformBaseUrl/v1/embeddings" -Headers @{
        Authorization = "Bearer $gatewayApiKey"
        "X-Request-Id" = $embeddingRequestId
    } -Body @{
        model = "text-embedding-v4"
        input = "embedding success"
    }
    Assert-True ($embedding.StatusCode -eq 200) "embeddings expected 200, got $($embedding.StatusCode): $($embedding.Content)"
    Assert-True ((Get-HeaderValue -Headers $embedding.Headers -Name "X-Request-Id") -eq $embeddingRequestId) "embeddings did not echo X-Request-Id"
    $embeddingJson = $embedding.Content | ConvertFrom-Json
    Assert-True ($embeddingJson.model -eq "text-embedding-v4") "embedding response model mismatch"
    Assert-True (@($embeddingJson.data[0].embedding).Count -gt 0) "embedding vector is empty"
    $embeddingUsage = Find-UsageLog -Headers $adminHeaders -TenantId $tenantId -ApiKeyId $gatewayApiKeyId -RequestId $embeddingRequestId -ModelCode "text-embedding-v4"
    Assert-True ($null -ne $embeddingUsage) "embedding usage log not found by request_id"
    Assert-True ([bool]$embeddingUsage.success) "embedding usage log is not success=true"
    Assert-True ($embeddingUsage.providerCode -eq "QWEN") "embedding usage provider mismatch"

    $rateKey = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys" -Headers $adminHeaders -Body @{
        name = "gateway-integration-rate-$suffix"
        scopes = @("chat:completion")
    }
    $rateApiKeyId = [long]$rateKey.data.id
    $createdApiKeyIds.Add($rateApiKeyId)
    $rateApiKey = [string]$rateKey.data.apiKey
    Invoke-Api -Method Put -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/rate-limits/api-keys/$rateApiKeyId" -Headers $adminHeaders -Body @{
        rpmLimit = 1
        status = "ACTIVE"
    } | Out-Null

    $rateFirstRequestId = "smoke-rate-first-$suffix"
    $rateFirst = Invoke-RawHttp -Method Post -Url "$PlatformBaseUrl/v1/chat/completions" -Headers @{
        Authorization = "Bearer $rateApiKey"
        "X-Request-Id" = $rateFirstRequestId
    } -Body @{
        model = "deepseek-chat"
        messages = @(@{ role = "user"; content = "first rate limited request" })
        temperature = 0.2
        max_tokens = 8
        stream = $false
    }
    Assert-True ($rateFirst.StatusCode -eq 200) "first rate-limit control request expected 200"

    $rateSecondRequestId = "smoke-rate-second-$suffix"
    $rateSecond = Invoke-RawHttp -Method Post -Url "$PlatformBaseUrl/v1/chat/completions" -Headers @{
        Authorization = "Bearer $rateApiKey"
        "X-Request-Id" = $rateSecondRequestId
    } -Body @{
        model = "deepseek-chat"
        messages = @(@{ role = "user"; content = "second rate limited request" })
        temperature = 0.2
        max_tokens = 8
        stream = $false
    }
    [void](Assert-OpenAiError -Response $rateSecond -ExpectedStatus 429 -ExpectedCode "rate_limit_rpm_exceeded")
    $rateUsage = Find-UsageLog -Headers $adminHeaders -TenantId $tenantId -ApiKeyId $rateApiKeyId -RequestId $rateSecondRequestId -ModelCode "deepseek-chat"
    Assert-True ($null -ne $rateUsage) "rate-limit failure usage log not found by request_id"
    Assert-True (-not [bool]$rateUsage.success) "rate-limit usage log should be success=false"
    Assert-True ($rateUsage.errorCode -eq "rate_limit_rpm_exceeded") "rate-limit usage log error code mismatch"

    [pscustomobject]@{
        chat = @{
            status = $chat.StatusCode
            requestId = $chatRequestId
            model = $chatJson.model
            totalTokens = $chatJson.usage.total_tokens
            chargeCredits = $chatUsage.chargeCredits
        }
        wallet = @{
            beforeBalance = $walletBefore.data.balanceCredits
            afterChatBalance = $walletAfterChat.data.balanceCredits
            settleLogFound = $true
        }
        embedding = @{
            deniedStatus = $embeddingDenied.StatusCode
            status = $embedding.StatusCode
            requestId = $embeddingRequestId
            usageLogged = $true
        }
        rateLimit = @{
            firstStatus = $rateFirst.StatusCode
            secondStatus = $rateSecond.StatusCode
            errorCode = $rateUsage.errorCode
        }
    } | ConvertTo-Json -Depth 10
} finally {
    foreach ($apiKeyId in $createdApiKeyIds) {
        try {
            Invoke-Api -Method Delete -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys/$apiKeyId" -Headers $adminHeaders | Out-Null
        } catch {
            Write-Warning "Failed to revoke temporary API key ${apiKeyId}: $($_.Exception.Message)"
        }
    }
}
