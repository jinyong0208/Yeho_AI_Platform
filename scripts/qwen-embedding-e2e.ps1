param(
    [string]$PlatformBaseUrl = "http://localhost:8080",
    [string]$TenantCode = "default",
    [string]$Username = "admin",
    [string]$Password = "Admin@123456",
    [string]$ProviderApiKey = "",
    [string]$BaseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1",
    [string]$ModelCode = "text-embedding-v4",
    [string]$GatewayApiKey = "",
    [string]$InputText = "Yeho AI Platform returns embeddings only; EDMS owns documents, chunks, vectors, RAG retrieval, and permissions.",
    [switch]$SkipProviderUpdate,
    [switch]$SkipProviderKeyUpdate,
    [switch]$SkipModelEnsure
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
        return [pscustomobject]@{
            StatusCode = [int]$response.StatusCode
            Headers = $response.Headers
            Content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        }
    } finally {
        $client.Dispose()
    }
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
    $logs = Invoke-Api -Method Get -Url "$PlatformBaseUrl/api/v1/usage-logs?tenantId=$TenantId&apiKeyId=$ApiKeyId&limit=80" -Headers $Headers
    return @($logs.data) | Where-Object {
        $_.requestId -eq $RequestId -and $_.modelCode -eq $ModelCode
    } | Select-Object -First 1
}

function Ensure-QwenEmbeddingModel {
    param(
        [hashtable]$Headers,
        [long]$ProviderId,
        [string]$ModelCode
    )
    $models = Invoke-Api -Method Get -Url "$PlatformBaseUrl/api/v1/models" -Headers $Headers
    $model = @($models.data) | Where-Object { $_.modelCode -eq $ModelCode -or $_.model_code -eq $ModelCode } | Select-Object -First 1
    if ($null -eq $model) {
        $created = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/models" -Headers $Headers -Body @{
            providerId = $ProviderId
            modelCode = $ModelCode
            displayName = "Qwen Text Embedding V4"
            inputPrice = 0
            outputPrice = 0
            inputCreditRate = 1
            outputCreditRate = 0
            billingMultiplier = 1
            supportStream = $false
            supportToolCall = $false
            status = "ACTIVE"
        }
        return $created.data
    }

    $modelId = [long]$model.id
    $status = if ($null -ne $model.status) { [string]$model.status } else { [string]$model.status_code }
    if ($status -ne "ACTIVE") {
        $updated = Invoke-Api -Method Put -Url "$PlatformBaseUrl/api/v1/models/$modelId" -Headers $Headers -Body @{
            providerId = $ProviderId
            displayName = "Qwen Text Embedding V4"
            inputCreditRate = 1
            outputCreditRate = 0
            billingMultiplier = 1
            supportStream = $false
            supportToolCall = $false
            status = "ACTIVE"
        }
        return $updated.data
    }
    return $model
}

$resolvedProviderApiKey = if ([string]::IsNullOrWhiteSpace($ProviderApiKey)) { $env:QWEN_API_KEY } else { $ProviderApiKey }
if (-not $SkipProviderKeyUpdate) {
    Assert-True (-not [string]::IsNullOrWhiteSpace($resolvedProviderApiKey)) "ProviderApiKey is required. Pass -ProviderApiKey or set QWEN_API_KEY."
}

$createdGatewayKeyId = $null

try {
    $login = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/auth/login" -Body @{
        tenantCode = $TenantCode
        username = $Username
        password = $Password
    }
    $tenantId = [long]$login.data.tenantId
    $adminHeaders = @{ Authorization = "Bearer $($login.data.accessToken)" }

    $providers = Invoke-Api -Method Get -Url "$PlatformBaseUrl/api/v1/providers" -Headers $adminHeaders
    $provider = @($providers.data) | Where-Object { $_.providerCode -eq "QWEN" -or $_.provider_code -eq "QWEN" } | Select-Object -First 1
    Assert-True ($null -ne $provider) "Provider not found: QWEN"
    $providerId = [long]$provider.id

    if (-not $SkipProviderUpdate) {
        Invoke-Api -Method Put -Url "$PlatformBaseUrl/api/v1/providers/$providerId" -Headers $adminHeaders -Body @{
            providerName = if ($null -ne $provider.providerName) { $provider.providerName } else { "Qwen" }
            baseUrl = $BaseUrl
            status = "ACTIVE"
            timeoutMs = 120000
            retryCount = 0
            circuitFailureThreshold = 5
            circuitCooldownSeconds = 60
        } | Out-Null
    }

    if (-not $SkipProviderKeyUpdate) {
        Invoke-Api -Method Put -Url "$PlatformBaseUrl/api/v1/providers/$providerId/api-key" -Headers $adminHeaders -Body @{
            apiKey = $resolvedProviderApiKey
        } | Out-Null
    }

    if (-not $SkipModelEnsure) {
        [void](Ensure-QwenEmbeddingModel -Headers $adminHeaders -ProviderId $providerId -ModelCode $ModelCode)
    }

    $effectiveGatewayApiKey = $GatewayApiKey
    $gatewayApiKeyId = $null
    if ([string]::IsNullOrWhiteSpace($effectiveGatewayApiKey)) {
        $temporaryKey = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys" -Headers $adminHeaders -Body @{
            name = "qwen-embedding-e2e-$(Get-Date -Format yyyyMMddHHmmss)"
            scopes = @("embedding:create", "models:read", "usage:read")
        }
        $createdGatewayKeyId = [long]$temporaryKey.data.id
        $gatewayApiKeyId = $createdGatewayKeyId
        $effectiveGatewayApiKey = [string]$temporaryKey.data.apiKey
    } else {
        $gatewayApiKeyId = 0
    }

    $requestId = "qwen-embedding-e2e-$([DateTimeOffset]::Now.ToUnixTimeMilliseconds())"
    $embedding = Invoke-RawHttp -Method Post -Url "$PlatformBaseUrl/v1/embeddings" -Headers @{
        Authorization = "Bearer $effectiveGatewayApiKey"
        "X-Request-Id" = $requestId
    } -Body @{
        model = $ModelCode
        input = $InputText
        encoding_format = "float"
    }

    Assert-True ($embedding.StatusCode -eq 200) "Embeddings expected 200, got $($embedding.StatusCode): $($embedding.Content)"
    Assert-True ((Get-HeaderValue -Headers $embedding.Headers -Name "X-Request-Id") -eq $requestId) "Embeddings did not echo X-Request-Id"
    $embeddingJson = $embedding.Content | ConvertFrom-Json
    Assert-True ($embeddingJson.model -eq $ModelCode) "Embedding response model mismatch"
    $vectorLength = @($embeddingJson.data[0].embedding).Count
    Assert-True ($vectorLength -gt 0) "Embedding vector is empty"

    $usage = $null
    if ($gatewayApiKeyId -ne 0) {
        $usage = Find-UsageLog -Headers $adminHeaders -TenantId $tenantId -ApiKeyId $gatewayApiKeyId -RequestId $requestId -ModelCode $ModelCode
        Assert-True ($null -ne $usage) "Embedding usage log not found by request_id"
        Assert-True ([bool]$usage.success) "Embedding usage log is not success=true"
        Assert-True ($usage.providerCode -eq "QWEN") "Embedding usage provider mismatch"
    }

    [pscustomobject]@{
        providerCode = "QWEN"
        providerId = $providerId
        modelCode = $ModelCode
        requestId = $requestId
        status = $embedding.StatusCode
        vectorDimensions = $vectorLength
        promptTokens = $embeddingJson.usage.prompt_tokens
        totalTokens = $embeddingJson.usage.total_tokens
        usageLogged = $null -ne $usage
        boundary = "Embedding vector returned to caller only; script does not persist documents, chunks, or vectors."
    } | ConvertTo-Json -Depth 10
} finally {
    if ($createdGatewayKeyId) {
        try {
            Invoke-Api -Method Delete -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys/$createdGatewayKeyId" -Headers $adminHeaders | Out-Null
        } catch {
            Write-Warning "Failed to revoke temporary gateway API key ${createdGatewayKeyId}: $($_.Exception.Message)"
        }
    }
}
