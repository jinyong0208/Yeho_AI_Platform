param(
    [string]$PlatformBaseUrl = "http://localhost:8080",
    [string]$TenantCode = "default",
    [string]$Username = "admin",
    [string]$Password = "Admin@123456",
    [string]$MockProviderBaseUrl = ""
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

function Assert-OpenAiError {
    param(
        [object]$Response,
        [int]$ExpectedStatus,
        [string]$ExpectedCode
    )
    Assert-True ($Response.StatusCode -eq $ExpectedStatus) "Expected HTTP $ExpectedStatus, got $($Response.StatusCode): $($Response.Content)"
    $json = $Response.Content | ConvertFrom-Json
    Assert-True ($null -ne $json.error) "Missing OpenAI-compatible error envelope"
    Assert-True ([string]$json.error.code -eq $ExpectedCode) "Expected error code $ExpectedCode, got $($json.error.code)"
    return $json
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
    return $provider
}

function Start-RawChatJob {
    param(
        [string]$PlatformBaseUrl,
        [string]$ApiKey,
        [string]$RequestId,
        [string]$Content,
        [int]$MaxTokens
    )
    $body = @{
        model = "deepseek-chat"
        messages = @(@{ role = "user"; content = $Content })
        temperature = 0.2
        max_tokens = $MaxTokens
        stream = $false
    } | ConvertTo-Json -Depth 12
    Start-Job -ScriptBlock {
        param($Url, $Key, $RequestId, $Payload)
        try {
            $response = Invoke-WebRequest -Uri "$Url/v1/chat/completions" -Method Post -Headers @{
                Authorization = "Bearer $Key"
                "X-Request-Id" = $RequestId
            } -ContentType "application/json" -Body $Payload -UseBasicParsing
            [pscustomobject]@{
                StatusCode = [int]$response.StatusCode
                Content = [string]$response.Content
            }
        } catch {
            $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
            $content = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
            [pscustomobject]@{
                StatusCode = $status
                Content = [string]$content
            }
        }
    } -ArgumentList $PlatformBaseUrl, $ApiKey, $RequestId, $body
}

$createdApiKeyIds = New-Object System.Collections.Generic.List[long]

try {
    if ([string]::IsNullOrWhiteSpace($MockProviderBaseUrl)) {
        $MockProviderBaseUrl = "$PlatformBaseUrl/mock-provider/v1"
    }

    $login = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/auth/login" -Body @{
        tenantCode = $TenantCode
        username = $Username
        password = $Password
    }
    $tenantId = [long]$login.data.tenantId
    $adminHeaders = @{ Authorization = "Bearer $($login.data.accessToken)" }
    [void](Configure-MockProvider -Headers $adminHeaders -ProviderCode "DEEPSEEK" -BaseUrl $MockProviderBaseUrl)
    $suffix = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()

    $tpmKey = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys" -Headers $adminHeaders -Body @{
        name = "rate-hardening-tpm-$suffix"
        scopes = @("chat:completion", "usage:read")
    }
    $tpmApiKeyId = [long]$tpmKey.data.id
    $createdApiKeyIds.Add($tpmApiKeyId)
    Invoke-Api -Method Put -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/rate-limits/api-keys/$tpmApiKeyId" -Headers $adminHeaders -Body @{
        tpmLimit = 10
        status = "ACTIVE"
    } | Out-Null

    $tpmRequestId = "rate-hardening-tpm-$suffix"
    $tpmResponse = Invoke-RawHttp -Method Post -Url "$PlatformBaseUrl/v1/chat/completions" -Headers @{
        Authorization = "Bearer $($tpmKey.data.apiKey)"
        "X-Request-Id" = $tpmRequestId
    } -Body @{
        model = "deepseek-chat"
        messages = @(@{ role = "user"; content = "this request is intentionally long enough to exceed tpm" })
        temperature = 0.2
        max_tokens = 16
        stream = $false
    }
    [void](Assert-OpenAiError -Response $tpmResponse -ExpectedStatus 429 -ExpectedCode "rate_limit_tpm_exceeded")
    $tpmUsage = Find-UsageLog -Headers $adminHeaders -TenantId $tenantId -ApiKeyId $tpmApiKeyId -RequestId $tpmRequestId -ModelCode "deepseek-chat"
    Assert-True ($null -ne $tpmUsage) "TPM usage log not found"
    Assert-True ($tpmUsage.errorCode -eq "rate_limit_tpm_exceeded") "TPM usage log error code mismatch"

    $concurrentKey = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys" -Headers $adminHeaders -Body @{
        name = "rate-hardening-concurrent-$suffix"
        scopes = @("chat:completion", "usage:read")
    }
    $concurrentApiKeyId = [long]$concurrentKey.data.id
    $createdApiKeyIds.Add($concurrentApiKeyId)
    Invoke-Api -Method Put -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/rate-limits/api-keys/$concurrentApiKeyId" -Headers $adminHeaders -Body @{
        maxConcurrent = 1
        status = "ACTIVE"
    } | Out-Null

    $firstRequestId = "rate-hardening-concurrent-first-$suffix"
    $secondRequestId = "rate-hardening-concurrent-second-$suffix"
    $firstJob = Start-RawChatJob -PlatformBaseUrl $PlatformBaseUrl -ApiKey $concurrentKey.data.apiKey -RequestId $firstRequestId -Content "[mock-delay-ms=3000] hold the first concurrent request" -MaxTokens 16
    Start-Sleep -Milliseconds 300
    $secondResponse = Invoke-RawHttp -Method Post -Url "$PlatformBaseUrl/v1/chat/completions" -Headers @{
        Authorization = "Bearer $($concurrentKey.data.apiKey)"
        "X-Request-Id" = $secondRequestId
    } -Body @{
        model = "deepseek-chat"
        messages = @(@{ role = "user"; content = "second concurrent request should be rejected" })
        temperature = 0.2
        max_tokens = 8
        stream = $false
    }
    [void](Assert-OpenAiError -Response $secondResponse -ExpectedStatus 429 -ExpectedCode "rate_limit_concurrent_exceeded")
    $firstResult = Receive-Job -Job $firstJob -Wait -AutoRemoveJob
    Assert-True ($firstResult.StatusCode -eq 200) "First concurrent holder request expected 200, got $($firstResult.StatusCode): $($firstResult.Content)"
    $concurrentUsage = Find-UsageLog -Headers $adminHeaders -TenantId $tenantId -ApiKeyId $concurrentApiKeyId -RequestId $secondRequestId -ModelCode "deepseek-chat"
    Assert-True ($null -ne $concurrentUsage) "Concurrent usage log not found"
    Assert-True ($concurrentUsage.errorCode -eq "rate_limit_concurrent_exceeded") "Concurrent usage log error code mismatch"

    [pscustomobject]@{
        tpm = @{
            status = $tpmResponse.StatusCode
            errorCode = $tpmUsage.errorCode
            requestId = $tpmRequestId
        }
        concurrent = @{
            firstStatus = $firstResult.StatusCode
            secondStatus = $secondResponse.StatusCode
            errorCode = $concurrentUsage.errorCode
            firstRequestId = $firstRequestId
            secondRequestId = $secondRequestId
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
