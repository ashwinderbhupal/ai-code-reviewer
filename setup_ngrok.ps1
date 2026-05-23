<#
.SYNOPSIS
    Download ngrok for Windows, configure your authtoken, and tunnel
    localhost:8000 to the public internet so GitHub webhooks can reach
    your local FastAPI backend.

.DESCRIPTION
    1. Downloads ngrok-v3-stable-windows-amd64.zip from bin.equinox.io
       (the official mirror used by ngrok.com).
    2. Extracts ngrok.exe next to this script.
    3. Checks that an authtoken is configured. If not, prompts you for
       one and runs `ngrok config add-authtoken`.
    4. Starts `ngrok http 8000` in the foreground.

    Re-running the script is safe: if ngrok.exe already exists it is
    reused, and if your authtoken is already configured the prompt is
    skipped.

.NOTES
    No admin rights required. The download lands in your TEMP folder
    and ngrok.exe lives in the same folder as this script.
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

# --- Constants ------------------------------------------------------------
$ScriptDir  = $PSScriptRoot
$NgrokExe   = Join-Path $ScriptDir "ngrok.exe"
$ZipUrl     = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
$ZipPath    = Join-Path $env:TEMP "ngrok-v3-stable-windows-amd64.zip"
$ExtractDir = Join-Path $env:TEMP "ngrok-extract-$([System.Guid]::NewGuid().ToString('N'))"

# --- 1. Download ----------------------------------------------------------
if (Test-Path $NgrokExe) {
    Write-Step "ngrok.exe already exists at $NgrokExe -- skipping download."
} else {
    Write-Step "Downloading ngrok from $ZipUrl"
    try {
        # TLS 1.2 is required by bin.equinox.io and not the default on PS 5.1.
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath -UseBasicParsing
        Write-Ok "Downloaded to $ZipPath"
    } catch {
        Write-Err "Download failed: $($_.Exception.Message)"
        exit 1
    }

    Write-Step "Extracting ngrok.exe"
    try {
        New-Item -ItemType Directory -Path $ExtractDir -Force | Out-Null
        Expand-Archive -Path $ZipPath -DestinationPath $ExtractDir -Force

        $extracted = Get-ChildItem -Path $ExtractDir -Filter "ngrok.exe" -Recurse |
                     Select-Object -First 1
        if (-not $extracted) {
            Write-Err "ngrok.exe was not found inside the zip."
            exit 1
        }
        Copy-Item -Path $extracted.FullName -Destination $NgrokExe -Force
        Write-Ok "Installed to $NgrokExe"
    } catch {
        Write-Err "Extraction failed: $($_.Exception.Message)"
        exit 1
    } finally {
        Remove-Item -Path $ZipPath      -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $ExtractDir   -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# --- 2. Verify ngrok runs -------------------------------------------------
Write-Step "Verifying ngrok install"
try {
    $version = & $NgrokExe --version 2>&1
    Write-Ok $version
} catch {
    Write-Err "Could not run ngrok.exe: $($_.Exception.Message)"
    exit 1
}

# --- 3. Authtoken check ---------------------------------------------------
Write-Step "Checking your ngrok authtoken"

$configOk = $false
try {
    # `ngrok config check` exits 0 only when there is a valid config
    # file AND an authtoken inside it.
    & $NgrokExe config check 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $configOk = $true
    }
} catch {
    $configOk = $false
}

if ($configOk) {
    Write-Ok "Authtoken is already configured."
} else {
    Write-Warn "No authtoken found. ngrok requires a free account."
    Write-Host ""
    Write-Host "    1. Sign up (or log in) at: https://dashboard.ngrok.com/signup" -ForegroundColor White
    Write-Host "    2. Copy your token from:   https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
    Write-Host ""
    $token = Read-Host "    Paste your ngrok authtoken (leave blank to cancel)"
    if ([string]::IsNullOrWhiteSpace($token)) {
        Write-Err "No token entered. Aborting."
        exit 1
    }
    try {
        & $NgrokExe config add-authtoken $token.Trim()
        if ($LASTEXITCODE -ne 0) { throw "ngrok exited with code $LASTEXITCODE" }
        Write-Ok "Authtoken saved."
    } catch {
        Write-Err "Failed to save authtoken: $($_.Exception.Message)"
        exit 1
    }
}

# --- 4. Start the tunnel --------------------------------------------------
Write-Step "Starting tunnel: ngrok http 8000"
Write-Host ""
Write-Host "    Watch the 'Forwarding' line below for your public URL." -ForegroundColor White
Write-Host "    Paste that URL + '/webhook' into your GitHub webhook settings." -ForegroundColor White
Write-Host "    Press Ctrl+C to stop the tunnel." -ForegroundColor White
Write-Host ""

& $NgrokExe http 8000
