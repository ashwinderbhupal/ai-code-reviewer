<#
.SYNOPSIS
    One-shot launcher for the AI Code Reviewer stack.

.DESCRIPTION
    Opens two new PowerShell windows (backend + frontend), waits for
    them to warm up, then starts an ngrok tunnel to the backend in the
    current window and prints the public URL in a copy-friendly banner.

    Backend window  : cd backend  ; pip install -r requirements.txt ; uvicorn main:app --reload --host 0.0.0.0 --port 8000
    Frontend window : cd frontend ; npm install ; npm start
    This window     : ngrok http 8000

.NOTES
    * No admin rights required.
    * Run setup_ngrok.ps1 first so ngrok.exe is present in this folder
      (or have ngrok already installed on PATH).
    * Close the spawned windows manually when you're done, or press
      Ctrl+C in this window to stop the tunnel.
#>

$ErrorActionPreference = "Stop"

# --- Pretty print helpers -------------------------------------------------
function Write-Step($message) {
    Write-Host ""
    Write-Host "==> $message" -ForegroundColor Cyan
}
function Write-Ok($message) {
    Write-Host "    [ok] $message" -ForegroundColor Green
}
function Write-Warn($message) {
    Write-Host "    [warn] $message" -ForegroundColor Yellow
}
function Write-Err($message) {
    Write-Host "    [error] $message" -ForegroundColor Red
}

# --- Paths ----------------------------------------------------------------
$ScriptDir   = $PSScriptRoot
$BackendDir  = Join-Path $ScriptDir "backend"
$FrontendDir = Join-Path $ScriptDir "frontend"
$NgrokLocal  = Join-Path $ScriptDir "ngrok.exe"

if (-not (Test-Path $BackendDir))  {
    Write-Err "backend folder not found at $BackendDir"; exit 1
}
if (-not (Test-Path $FrontendDir)) {
    Write-Err "frontend folder not found at $FrontendDir"; exit 1
}

# --- Resolve ngrok --------------------------------------------------------
$NgrokCmd = $null
if (Test-Path $NgrokLocal) {
    $NgrokCmd = $NgrokLocal
} else {
    $onPath = Get-Command ngrok.exe -ErrorAction SilentlyContinue
    if ($onPath) { $NgrokCmd = $onPath.Source }
}

if (-not $NgrokCmd) {
    Write-Err "ngrok was not found in '$ScriptDir' and is not on PATH."
    Write-Host "    Run .\setup_ngrok.ps1 first, then re-run this script." -ForegroundColor Yellow
    exit 1
}
Write-Ok "Using ngrok at $NgrokCmd"

# --- 1. Start the backend in a new window ---------------------------------
Write-Step "Launching backend window"

$backendCommand = @"
`$Host.UI.RawUI.WindowTitle = 'AI Code Reviewer - Backend'
Set-Location '$BackendDir'
Write-Host '=== Installing Python dependencies ===' -ForegroundColor Cyan
pip install -r requirements.txt
if (`$LASTEXITCODE -ne 0) {
    Write-Host 'pip install failed. Check Python 3.9+ is on PATH.' -ForegroundColor Red
    Read-Host 'Press Enter to close this window'
    exit 1
}
Write-Host '=== Starting Uvicorn on http://localhost:8000 ===' -ForegroundColor Cyan
uvicorn main:app --reload --host 0.0.0.0 --port 8000
Read-Host 'Backend stopped. Press Enter to close this window'
"@

try {
    Start-Process -FilePath "powershell.exe" `
        -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand) `
        -WorkingDirectory $BackendDir | Out-Null
    Write-Ok "Backend window launched."
} catch {
    Write-Err "Could not start backend window: $($_.Exception.Message)"
    exit 1
}

# --- 2. Start the frontend in a new window --------------------------------
Write-Step "Launching frontend window"

$frontendCommand = @"
`$Host.UI.RawUI.WindowTitle = 'AI Code Reviewer - Frontend'
Set-Location '$FrontendDir'
`$env:BROWSER = 'none'
Write-Host '=== Installing Node dependencies ===' -ForegroundColor Cyan
npm install
if (`$LASTEXITCODE -ne 0) {
    Write-Host 'npm install failed. Check Node.js 18+ is on PATH.' -ForegroundColor Red
    Read-Host 'Press Enter to close this window'
    exit 1
}
Write-Host '=== Starting React dev server on http://localhost:3000 ===' -ForegroundColor Cyan
npm start
Read-Host 'Frontend stopped. Press Enter to close this window'
"@

try {
    Start-Process -FilePath "powershell.exe" `
        -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand) `
        -WorkingDirectory $FrontendDir | Out-Null
    Write-Ok "Frontend window launched."
} catch {
    Write-Err "Could not start frontend window: $($_.Exception.Message)"
    exit 1
}

# --- 3. Wait for servers to come up ---------------------------------------
Write-Step "Waiting 10 seconds for backend + frontend to start"
for ($i = 10; $i -gt 0; $i--) {
    Write-Host ("    {0,2}s..." -f $i) -NoNewline
    Start-Sleep -Seconds 1
    Write-Host "`r" -NoNewline
}
Write-Host "         "

# --- 4. Start ngrok as a background process so we can read its API --------
Write-Step "Starting ngrok tunnel to http://localhost:8000"

# Run ngrok in a new visible window so its TUI doesn't fight with this
# window's banner output. We still poll its local API for the URL.
$ngrokProcess = $null
try {
    $ngrokProcess = Start-Process -FilePath $NgrokCmd `
        -ArgumentList @("http", "8000") `
        -PassThru
    Write-Ok "ngrok started (PID $($ngrokProcess.Id))."
} catch {
    Write-Err "Could not start ngrok: $($_.Exception.Message)"
    exit 1
}

# --- 5. Poll ngrok's local API for the public URL -------------------------
Write-Step "Fetching public URL from ngrok (this can take ~5 seconds)"

$publicUrl = $null
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" `
                                  -TimeoutSec 2 -ErrorAction Stop
        $httpsTunnel = $resp.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1
        if ($httpsTunnel) {
            $publicUrl = $httpsTunnel.public_url
            break
        }
        $anyTunnel = $resp.tunnels | Select-Object -First 1
        if ($anyTunnel) {
            $publicUrl = $anyTunnel.public_url
            break
        }
    } catch {
        # API not up yet; keep polling.
    }
}

if (-not $publicUrl) {
    Write-Err "Timed out waiting for ngrok to publish a tunnel URL."
    Write-Warn "Open http://127.0.0.1:4040 in your browser to see what ngrok reports."
    Write-Warn "(Most common cause: missing authtoken. Run .\setup_ngrok.ps1 to configure it.)"
} else {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  ngrok is live" -ForegroundColor Green
    Write-Host "------------------------------------------------------------" -ForegroundColor Green
    Write-Host "  Public URL          : $publicUrl"                    -ForegroundColor Yellow
    Write-Host "  GitHub webhook URL  : $publicUrl/webhook"            -ForegroundColor Yellow
    Write-Host "  Backend (local)     : http://localhost:8000"         -ForegroundColor White
    Write-Host "  Frontend (local)    : http://localhost:3000"         -ForegroundColor White
    Write-Host "  ngrok dashboard     : http://127.0.0.1:4040"         -ForegroundColor White
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Paste the GitHub webhook URL into:" -ForegroundColor White
    Write-Host "    Repo Settings -> Webhooks -> Add webhook -> Payload URL" -ForegroundColor White
    Write-Host ""
}

# --- 6. Keep the window open so the user can read the banner --------------
Write-Host "Press Enter to stop ngrok and close this window..." -ForegroundColor Cyan
Read-Host | Out-Null

# Tear down the ngrok process we spawned. The backend and frontend windows
# stay open on purpose -- close them yourself when you're done.
if ($ngrokProcess -and -not $ngrokProcess.HasExited) {
    try {
        Stop-Process -Id $ngrokProcess.Id -Force -ErrorAction Stop
        Write-Ok "ngrok stopped."
    } catch {
        Write-Warn "Could not stop ngrok cleanly: $($_.Exception.Message)"
    }
}
