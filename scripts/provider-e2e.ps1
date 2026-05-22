param(
    [string]$PlatformBaseUrl = "http://localhost:8080",
    [string]$TenantCode = "default",
    [string]$Username = "admin",
    [string]$Password = "Admin@123456",
    [ValidateSet("DEEPSEEK", "QWEN", "OPENAI")]
    [string]$ProviderCode = "QWEN",
    [string]$ProviderApiKey = "",
    [string]$BaseUrl = "",
    [string]$ModelCode = "",
    [string]$GatewayApiKey = "",
    [switch]$SkipProviderUpdate,
    [switch]$SkipProviderKeyUpdate,
    [switch]$SkipGatewayChat,
    [switch]$AllowProviderFailure,
    [switch]$AllowGatewayFailure
)

$ErrorActionPreference = "Stop"

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
    return Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 10)
}

function Resolve-DefaultBaseUrl {
    param([string]$Code)
    switch ($Code.ToUpperInvariant()) {
        "DEEPSEEK" { return "https://api.deepseek.com" }
        "QWEN" { return "https://dashscope.aliyuncs.com/compatible-mode/v1" }
        "OPENAI" { return "https://api.openai.com/v1" }
        default { return "" }
    }
}

function Resolve-DefaultModelCode {
    param([string]$Code)
    switch ($Code.ToUpperInvariant()) {
        "DEEPSEEK" { return "deepseek-chat" }
        "QWEN" { return "qwen-plus" }
        "OPENAI" { return "gpt-4.1" }
        default { return "" }
    }
}

function Read-ProviderValue {
    param(
        [object]$Provider,
        [string]$Camel,
        [string]$Snake
    )
    if ($null -ne $Provider.$Camel) {
        return $Provider.$Camel
    }
    return $Provider.$Snake
}

function First-NonNull {
    param([object[]]$Values)
    foreach ($value in $Values) {
        if ($null -ne $value) {
            return $value
        }
    }
    return $null
}

$normalizedProviderCode = $ProviderCode.ToUpperInvariant()
$resolvedBaseUrl = if ([string]::IsNullOrWhiteSpace($BaseUrl)) { Resolve-DefaultBaseUrl $normalizedProviderCode } else { $BaseUrl.Trim() }
$resolvedModelCode = if ([string]::IsNullOrWhiteSpace($ModelCode)) { Resolve-DefaultModelCode $normalizedProviderCode } else { $ModelCode.Trim() }

Assert-True (-not [string]::IsNullOrWhiteSpace($resolvedBaseUrl)) "BaseUrl is required"
Assert-True (-not [string]::IsNullOrWhiteSpace($resolvedModelCode)) "ModelCode is required"

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
    $provider = @($providers.data) | Where-Object { $_.providerCode -eq $normalizedProviderCode -or $_.provider_code -eq $normalizedProviderCode } | Select-Object -First 1
    Assert-True ($null -ne $provider) "Provider not found: $normalizedProviderCode"
    $providerId = [long](Read-ProviderValue -Provider $provider -Camel "id" -Snake "id")

    if (-not $SkipProviderUpdate) {
        Invoke-Api -Method Put -Url "$PlatformBaseUrl/api/v1/providers/$providerId" -Headers $adminHeaders -Body @{
            providerName = Read-ProviderValue -Provider $provider -Camel "providerName" -Snake "provider_name"
            baseUrl = $resolvedBaseUrl
            status = "ACTIVE"
        } | Out-Null
    }

    if (-not $SkipProviderKeyUpdate -and -not [string]::IsNullOrWhiteSpace($ProviderApiKey)) {
        Invoke-Api -Method Put -Url "$PlatformBaseUrl/api/v1/providers/$providerId/api-key" -Headers $adminHeaders -Body @{
            apiKey = $ProviderApiKey
        } | Out-Null
    }

    $providerTest = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/providers/$providerId/test" -Headers $adminHeaders
    if (-not $AllowProviderFailure) {
        Assert-True ([bool]$providerTest.success) "Provider test failed: $($providerTest.errorCode) $($providerTest.errorMessage)"
    }

    $gatewayResult = $null
    if (-not $SkipGatewayChat) {
        $effectiveGatewayApiKey = $GatewayApiKey
        if ([string]::IsNullOrWhiteSpace($effectiveGatewayApiKey)) {
            $temporaryKey = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys" -Headers $adminHeaders -Body @{
                name = "provider-e2e-$normalizedProviderCode-$(Get-Date -Format yyyyMMddHHmmss)"
                scopes = @("chat:completion", "models:read")
            }
            $createdGatewayKeyId = [long]$temporaryKey.data.id
            $effectiveGatewayApiKey = [string]$temporaryKey.data.apiKey
        }

        try {
            $gatewayResult = Invoke-Api -Method Post -Url "$PlatformBaseUrl/v1/chat/completions" -Headers @{
                Authorization = "Bearer $effectiveGatewayApiKey"
            } -Body @{
                model = $resolvedModelCode
                messages = @(@{
                    role = "user"
                    content = "Return only: pong"
                })
                temperature = 0.2
                max_tokens = 16
                stream = $false
            }
        } catch {
            if (-not $AllowGatewayFailure) {
                throw
            }
            $gatewayResult = [pscustomobject]@{
                failed = $true
                message = $_.Exception.Message
            }
        }
    }

    $health = Invoke-Api -Method Get -Url "$PlatformBaseUrl/api/providers/health" -Headers $adminHeaders
    $targetHealth = @($health) | Where-Object {
        $_.provider_id -eq $providerId -or $_.providerId -eq $providerId
    } | Select-Object -First 1

    if ($createdGatewayKeyId) {
        Invoke-Api -Method Delete -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys/$createdGatewayKeyId" -Headers $adminHeaders | Out-Null
        $createdGatewayKeyId = $null
    }

    [pscustomobject]@{
        providerCode = $normalizedProviderCode
        providerId = $providerId
        baseUrl = $resolvedBaseUrl
        modelCode = $resolvedModelCode
        providerProbe = @{
            success = [bool]$providerTest.success
            requestId = $providerTest.requestId
            healthStatus = $providerTest.healthStatus
            latencyMs = $providerTest.latencyMs
            errorCode = $providerTest.errorCode
            errorMessage = $providerTest.errorMessage
        }
        gatewayChat = if ($null -eq $gatewayResult) {
            $null
        } elseif ($gatewayResult.failed) {
            $gatewayResult
        } else {
            @{
                id = $gatewayResult.id
                model = $gatewayResult.model
                totalTokens = $gatewayResult.usage.total_tokens
                finishReason = $gatewayResult.choices[0].finish_reason
            }
        }
        health = @{
            status = First-NonNull @($targetHealth.health_status, $targetHealth.healthStatus)
            consecutiveFailures = First-NonNull @($targetHealth.consecutive_failures, $targetHealth.consecutiveFailures)
            lastTestRequestId = First-NonNull @($targetHealth.last_test_request_id, $targetHealth.lastTestRequestId)
            lastTestErrorCode = First-NonNull @($targetHealth.last_test_error_code, $targetHealth.lastTestErrorCode)
        }
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
