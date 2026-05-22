param(
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$agentDir = Join-Path $root "apps/agent"
$outLog = Join-Path $agentDir ".uvicorn.out.log"
$errLog = Join-Path $agentDir ".uvicorn.err.log"
$pythonExe = Join-Path $agentDir ".venv/Scripts/python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

& $pythonExe -c "import fastapi, uvicorn, pydantic_settings"

$process = Start-Process -FilePath $pythonExe `
    -ArgumentList @("-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "$Port") `
    -WorkingDirectory $agentDir `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -WindowStyle Hidden `
    -PassThru

try {
    Start-Sleep -Seconds 3
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -Method Get
    $agentBody = @{
        input = "check wallet credits"
        tenantId = "1"
        userId = "1"
    } | ConvertTo-Json
    $agent = Invoke-RestMethod `
        -Uri "http://127.0.0.1:$Port/api/v1/agents/demo/run" `
        -Method Post `
        -ContentType "application/json" `
        -Body $agentBody
    [pscustomobject]@{
        health = $health.status
        service = $health.service
        agent = $agent.agentCode
        intent = $agent.intent
        steps = $agent.steps.Count
        port = $Port
    } | ConvertTo-Json
} finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force
    }
}
