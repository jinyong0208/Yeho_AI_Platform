param(
    [string]$PlatformBaseUrl = "http://localhost:8080",
    [string]$TenantCode = "default",
    [string]$Username = "admin",
    [string]$Password = "Admin@123456",
    [int]$TimeoutSeconds = 90,
    [switch]$RunProviderTest,
    [Nullable[long]]$ProviderId,
    [string]$ProviderCode = "",
    [switch]$RequireProviderSuccess
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

function Invoke-RawHttp {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [string]$ContentType = "application/json"
    )

    $client = [System.Net.Http.HttpClient]::new()
    try {
        $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new($Method), $Url)
        foreach ($key in $Headers.Keys) {
            [void]$request.Headers.TryAddWithoutValidation($key, [string]$Headers[$key])
        }
        if ($null -ne $Body) {
            $request.Content = [System.Net.Http.StringContent]::new([string]$Body, [System.Text.Encoding]::UTF8, $ContentType)
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
        [int]$ExpectedStatus
    )
    Assert-True ($Response.StatusCode -eq $ExpectedStatus) "Expected HTTP $ExpectedStatus, got $($Response.StatusCode)"
    $json = $Response.Content | ConvertFrom-Json
    Assert-True ($null -ne $json.error) "Missing OpenAI error envelope"
    Assert-True ([string]::IsNullOrWhiteSpace($json.error.message) -eq $false) "Missing OpenAI error message"
    Assert-True ([string]::IsNullOrWhiteSpace($json.error.type) -eq $false) "Missing OpenAI error type"
    Assert-True ($null -ne $json.error.code) "Missing OpenAI error code"
    return $json
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

$createdApiKeyId = $null
$createdTenantId = $null
$createdTenantUserId = $null
$providerTestResult = $null

try {
    $health = Wait-JsonEndpoint -Name "platform" -Url "$PlatformBaseUrl/api/v1/health"

    $login = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/auth/login" -Body @{
        tenantCode = $TenantCode
        username = $Username
        password = $Password
    }
    $adminHeaders = @{
        Authorization = "Bearer $($login.data.accessToken)"
    }
    $tenantId = [long]$login.data.tenantId
    $suffix = [DateTimeOffset]::Now.ToUnixTimeSeconds()

    $missingAuth = Invoke-RawHttp -Method Get -Url "$PlatformBaseUrl/v1/models"
    [void](Assert-OpenAiError -Response $missingAuth -ExpectedStatus 401)
    Assert-True ($missingAuth.Headers.Contains("X-Request-Id")) "Missing X-Request-Id on OpenAI-compatible error"

    $invalidKey = Invoke-RawHttp -Method Get -Url "$PlatformBaseUrl/v1/models" -Headers @{
        Authorization = "Bearer sk-invalid-closeout"
    }
    [void](Assert-OpenAiError -Response $invalidKey -ExpectedStatus 401)

    $apiKey = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys" -Headers $adminHeaders -Body @{
        name = "mvp-closeout-$suffix"
        scopes = @("models:read")
    }
    $createdApiKeyId = [long]$apiKey.data.id
    $plainApiKey = [string]$apiKey.data.apiKey

    $modelsEnabled = Invoke-RawHttp -Method Get -Url "$PlatformBaseUrl/v1/models" -Headers @{
        Authorization = "Bearer $plainApiKey"
    }
    Assert-True ($modelsEnabled.StatusCode -eq 200) "Created API key cannot read /v1/models"

    $disabled = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/api-keys/$createdApiKeyId/disable" -Headers $adminHeaders
    Assert-True ($disabled.status -eq "DISABLED") "API key disable did not return DISABLED"

    $modelsDisabled = Invoke-RawHttp -Method Get -Url "$PlatformBaseUrl/v1/models" -Headers @{
        Authorization = "Bearer $plainApiKey"
    }
    [void](Assert-OpenAiError -Response $modelsDisabled -ExpectedStatus 401)

    $enabled = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/api-keys/$createdApiKeyId/enable" -Headers $adminHeaders
    Assert-True ($enabled.status -eq "ACTIVE") "API key enable did not return ACTIVE"

    $summary = Invoke-Api -Method Get -Url "$PlatformBaseUrl/api/api-keys/$createdApiKeyId/usage-summary?days=7" -Headers $adminHeaders
    Assert-True ([long]$summary.apiKey.id -eq $createdApiKeyId) "API key usage summary returned the wrong key"

    $isoTenant = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/tenants" -Headers $adminHeaders -Body @{
        tenantCode = "mvpiso_$suffix"
        tenantName = "MVP Isolation $suffix"
        contactName = "MVP Tester"
        contactEmail = "mvp-$suffix@example.com"
    }
    $createdTenantId = [long]$isoTenant.data.id

    $isoUserName = "mvpiso$suffix"
    $isoPassword = "MvpIso@123456"
    $isoUser = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/tenants/$createdTenantId/users" -Headers $adminHeaders -Body @{
        username = $isoUserName
        password = $isoPassword
        displayName = "MVP Isolation User"
        email = "mvp-user-$suffix@example.com"
        roleCodes = @("TENANT_ADMIN")
    }
    $createdTenantUserId = [long]$isoUser.data.id

    $isoLogin = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/auth/login" -Body @{
        tenantCode = "mvpiso_$suffix"
        username = $isoUserName
        password = $isoPassword
    }
    $isoHeaders = @{
        Authorization = "Bearer $($isoLogin.data.accessToken)"
    }

    $crossTenantLifecycle = Invoke-RawHttp -Method Post -Url "$PlatformBaseUrl/api/api-keys/$createdApiKeyId/disable" -Headers $isoHeaders
    Assert-True ($crossTenantLifecycle.StatusCode -in @(403, 404, 500)) "Cross-tenant lifecycle call unexpectedly succeeded"

    $crossTenantConsole = Invoke-RawHttp -Method Get -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys" -Headers $isoHeaders
    Assert-True ($crossTenantConsole.StatusCode -ge 400) "Cross-tenant console API key list unexpectedly succeeded"

    $walletAlert = Invoke-Api -Method Get -Url "$PlatformBaseUrl/api/v1/wallets/alerts/low-balance?tenantId=$tenantId&thresholdCredits=999999999&limit=5" -Headers $adminHeaders
    $models = Invoke-Api -Method Get -Url "$PlatformBaseUrl/api/v1/models" -Headers $adminHeaders
    $modelItems = @($models.data)
    Assert-True ($modelItems.Count -gt 0) "No active models available for price version check"
    $firstModelId = [long]$modelItems[0].id
    $priceVersions = Invoke-Api -Method Get -Url "$PlatformBaseUrl/api/v1/models/$firstModelId/price-versions" -Headers $adminHeaders

    $providerHealth = Invoke-Api -Method Get -Url "$PlatformBaseUrl/api/providers/health" -Headers $adminHeaders
    if ($RunProviderTest) {
        $targetProviderId = $ProviderId
        if ($null -eq $targetProviderId -and -not [string]::IsNullOrWhiteSpace($ProviderCode)) {
            $providers = Invoke-Api -Method Get -Url "$PlatformBaseUrl/api/v1/providers" -Headers $adminHeaders
            $provider = @($providers.data) | Where-Object { $_.providerCode -eq $ProviderCode } | Select-Object -First 1
            Assert-True ($null -ne $provider) "Provider not found by code: $ProviderCode"
            $targetProviderId = [long]$provider.id
        }
        Assert-True ($null -ne $targetProviderId) "ProviderId or ProviderCode is required when RunProviderTest is set"
        $providerTestResult = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/providers/$targetProviderId/test" -Headers $adminHeaders
        if ($RequireProviderSuccess) {
            Assert-True ([bool]$providerTestResult.success) "Provider E2E test did not succeed"
        }
    }

    Invoke-Api -Method Delete -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys/$createdApiKeyId" -Headers $adminHeaders | Out-Null
    $createdApiKeyId = $null

    [pscustomobject]@{
        platform = $health.data.status
        loginUser = $login.data.username
        openAiMissingAuthStatus = $missingAuth.StatusCode
        openAiInvalidKeyStatus = $invalidKey.StatusCode
        requestIdHeader = $missingAuth.Headers.Contains("X-Request-Id")
        apiKeyLifecycle = "create-disable-enable-revoke"
        tenantIsolationLifecycleStatus = $crossTenantLifecycle.StatusCode
        tenantIsolationConsoleStatus = $crossTenantConsole.StatusCode
        lowBalanceRows = @($walletAlert.data).Count
        checkedModelId = $firstModelId
        priceVersionRows = @($priceVersions.data).Count
        providerHealthRows = @($providerHealth).Count
        providerTest = $providerTestResult
    } | ConvertTo-Json -Depth 10
} finally {
    if ($createdApiKeyId) {
        try {
            Invoke-Api -Method Delete -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys/$createdApiKeyId" -Headers $adminHeaders | Out-Null
        } catch {
            Write-Warning "Failed to revoke temporary API key ${createdApiKeyId}: $($_.Exception.Message)"
        }
    }
    if ($createdTenantUserId -and $createdTenantId) {
        try {
            Invoke-Api -Method Delete -Url "$PlatformBaseUrl/api/v1/tenants/$createdTenantId/users/$createdTenantUserId" -Headers $adminHeaders | Out-Null
        } catch {
            Write-Warning "Failed to delete temporary tenant user ${createdTenantUserId}: $($_.Exception.Message)"
        }
    }
    if ($createdTenantId) {
        try {
            Invoke-Api -Method Delete -Url "$PlatformBaseUrl/api/v1/tenants/$createdTenantId" -Headers $adminHeaders | Out-Null
        } catch {
            Write-Warning "Failed to delete temporary tenant ${createdTenantId}: $($_.Exception.Message)"
        }
    }
}
