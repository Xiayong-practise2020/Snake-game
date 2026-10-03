param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$gameUrl = 'http://127.0.0.1:17863'
try {
    $portableNode = Join-Path $projectRoot '.runtime\node-v22.20.0-win-x64\node.exe'
    if (Test-Path -LiteralPath $portableNode) { $nodePath = $portableNode }
    else { $nodePath = (Get-Command node -ErrorAction Stop).Source }
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist\index.html'))) {
        $env:PATH = "$(Split-Path -Parent $nodePath);$env:PATH"
        Push-Location $projectRoot
        try {
            if (-not (Test-Path -LiteralPath 'node_modules')) {
                & npm.cmd ci
                if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Please run npm ci.' }
            }
            & npm.cmd run build
            if ($LASTEXITCODE -ne 0) { throw 'Game build failed. Please run npm run build.' }
        } finally { Pop-Location }
    }
    function Test-GameServer {
        try {
            $health = Invoke-RestMethod -Uri "$gameUrl/__health" -TimeoutSec 1
            return $health.name -eq 'snake-game' -and $health.root -eq $projectRoot
        } catch { return $false }
    }
    if (-not (Test-GameServer)) {
        $serverFile = Join-Path $PSScriptRoot 'game-server.mjs'
        $serverProcess = Start-Process -FilePath $nodePath -ArgumentList @('"' + $serverFile + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
        $ready = $false
        for ($attempt = 0; $attempt -lt 40; $attempt++) {
            if (Test-GameServer) { $ready = $true; break }
            if ($serverProcess.HasExited) { throw 'Game server could not start. Port 17863 may be in use.' }
            Start-Sleep -Milliseconds 250
        }
        if (-not $ready) { throw 'Game server did not start in time. Please try again.' }
    }
    if (-not $NoBrowser) { Start-Process $gameUrl }
    Write-Output $gameUrl
} catch {
    if ($NoBrowser) { throw }
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($_.Exception.Message, 'Snake - Startup error', 'OK', 'Error') | Out-Null
    exit 1
}
