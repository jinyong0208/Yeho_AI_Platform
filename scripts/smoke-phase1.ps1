param(
    [string]$BaseUrl = "http://localhost:8080/api/v1",
    [string]$TenantCode = "default",
    [string]$Username = "admin",
    [string]$Password = "Admin@123456"
)

$ErrorActionPreference = "Stop"

$health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get

$loginBody = @{
    tenantCode = $TenantCode
    username = $Username
    password = $Password
} | ConvertTo-Json

$login = Invoke-RestMethod -Uri "$BaseUrl/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $loginBody

$headers = @{
    Authorization = "Bearer $($login.data.accessToken)"
}

$suffix = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$tenantBody = @{
    tenantCode = "phase1_$suffix"
    tenantName = "Phase 1 Test Tenant"
    contactName = "Tester"
    contactEmail = "tester@example.com"
} | ConvertTo-Json

$tenant = Invoke-RestMethod -Uri "$BaseUrl/tenants" `
    -Method Post `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $tenantBody

$tenantId = $tenant.data.id

$tenantUpdateBody = @{
    tenantName = "Phase 1 Test Tenant Updated"
    status = "ACTIVE"
    contactName = "Tester"
    contactEmail = "tester@example.com"
} | ConvertTo-Json

$updatedTenant = Invoke-RestMethod -Uri "$BaseUrl/tenants/$tenantId" `
    -Method Put `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $tenantUpdateBody

$userBody = @{
    username = "dev$suffix"
    password = "Dev@123456"
    displayName = "Phase 1 Dev"
    email = "dev$suffix@example.com"
    roleCodes = @("VIEWER")
} | ConvertTo-Json

$user = Invoke-RestMethod -Uri "$BaseUrl/tenants/$tenantId/users" `
    -Method Post `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $userBody

$users = Invoke-RestMethod -Uri "$BaseUrl/tenants/$tenantId/users" `
    -Method Get `
    -Headers $headers

Invoke-RestMethod -Uri "$BaseUrl/tenants/$tenantId/users/$($user.data.id)" `
    -Method Delete `
    -Headers $headers | Out-Null

Invoke-RestMethod -Uri "$BaseUrl/tenants/$tenantId" `
    -Method Delete `
    -Headers $headers | Out-Null

[pscustomobject]@{
    health = $health.data.status
    loginUser = $login.data.username
    roles = [string]::Join(",", $login.data.roles)
    tenantCreated = $tenant.data.tenantCode
    tenantUpdated = $updatedTenant.data.tenantName
    usersListed = $users.data.Count
    cleanup = "deleted"
} | ConvertTo-Json
