param(
    [string]$PlatformBaseUrl = "http://localhost:8080",
    [string]$TenantCode = "default",
    [string]$Username = "admin",
    [string]$Password = "Admin@123456"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

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
            $request.Content = [System.Net.Http.StringContent]::new([string]$Body, [System.Text.Encoding]::UTF8, "application/json")
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

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )
    if (-not $Condition) {
        throw $Message
    }
}

function Assert-OpenAiError {
    param(
        [object]$Response,
        [int[]]$ExpectedStatuses,
        [string]$Name
    )
    Assert-True ($ExpectedStatuses -contains $Response.StatusCode) "$Name expected one of $($ExpectedStatuses -join ','), got $($Response.StatusCode)"
    Assert-True ($Response.Headers.Contains("X-Request-Id")) "$Name missing X-Request-Id"
    $json = $Response.Content | ConvertFrom-Json
    Assert-True ($null -ne $json.error) "$Name missing error envelope"
    Assert-True ($null -ne $json.error.message -and $json.error.message.Length -gt 0) "$Name missing error.message"
    Assert-True ($null -ne $json.error.type -and $json.error.type.Length -gt 0) "$Name missing error.type"
    Assert-True ($null -ne $json.error.code) "$Name missing error.code"
    return [pscustomobject]@{
        name = $Name
        status = $Response.StatusCode
        type = $json.error.type
        code = $json.error.code
        requestId = $Response.Headers.GetValues("X-Request-Id") | Select-Object -First 1
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

$createdApiKeyId = $null
$tenantId = $null
$adminHeaders = $null

try {
    $login = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/auth/login" -Body @{
        tenantCode = $TenantCode
        username = $Username
        password = $Password
    }
    $tenantId = [long]$login.data.tenantId
    $adminHeaders = @{ Authorization = "Bearer $($login.data.accessToken)" }

    $suffix = [DateTimeOffset]::Now.ToUnixTimeSeconds()
    $apiKey = Invoke-Api -Method Post -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys" -Headers $adminHeaders -Body @{
        name = "regression-errors-$suffix"
        scopes = @("models:read")
    }
    $createdApiKeyId = [long]$apiKey.data.id
    $modelsOnlyKey = [string]$apiKey.data.apiKey

    $chatBody = '{
      "model": "deepseek-chat",
      "messages": [
        { "role": "user", "content": "ping" }
      ],
      "temperature": 0.2,
      "max_tokens": 8,
      "stream": false
    }'
    $embeddingBody = '{
      "model": "qwen-text-embedding",
      "input": "ping"
    }'

    $results = @()
    $results += Assert-OpenAiError -Name "models missing auth" `
        -Response (Invoke-RawHttp -Method Get -Url "$PlatformBaseUrl/v1/models") `
        -ExpectedStatuses @(401)
    $results += Assert-OpenAiError -Name "chat missing auth" `
        -Response (Invoke-RawHttp -Method Post -Url "$PlatformBaseUrl/v1/chat/completions" -Body $chatBody) `
        -ExpectedStatuses @(401)
    $results += Assert-OpenAiError -Name "embeddings missing auth" `
        -Response (Invoke-RawHttp -Method Post -Url "$PlatformBaseUrl/v1/embeddings" -Body $embeddingBody) `
        -ExpectedStatuses @(401)
    $results += Assert-OpenAiError -Name "models invalid key" `
        -Response (Invoke-RawHttp -Method Get -Url "$PlatformBaseUrl/v1/models" -Headers @{ Authorization = "Bearer sk-invalid-regression" }) `
        -ExpectedStatuses @(401)
    $results += Assert-OpenAiError -Name "chat scope denied" `
        -Response (Invoke-RawHttp -Method Post -Url "$PlatformBaseUrl/v1/chat/completions" -Headers @{ Authorization = "Bearer $modelsOnlyKey" } -Body $chatBody) `
        -ExpectedStatuses @(403)

    Invoke-Api -Method Delete -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys/$createdApiKeyId" -Headers $adminHeaders | Out-Null
    $createdApiKeyId = $null

    [pscustomobject]@{
        checked = $results.Count
        results = $results
    } | ConvertTo-Json -Depth 10
} finally {
    if ($createdApiKeyId -and $tenantId -and $adminHeaders) {
        try {
            Invoke-Api -Method Delete -Url "$PlatformBaseUrl/api/v1/tenants/$tenantId/api-keys/$createdApiKeyId" -Headers $adminHeaders | Out-Null
        } catch {
            Write-Warning "Failed to revoke temporary API key ${createdApiKeyId}: $($_.Exception.Message)"
        }
    }
}
