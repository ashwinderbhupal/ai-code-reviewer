@echo off
REM ---------------------------------------------------------------------------
REM Start the AI Code Reviewer frontend (React + Tailwind dev server).
REM
REM Prerequisites:
REM   * Node.js 18+ and npm on PATH
REM   * The backend is reachable at the URL in .env (defaults to localhost:8000)
REM ---------------------------------------------------------------------------

setlocal

cd /d "%~dp0"

REM Skip the auto-browser launch: on some Windows setups it spawns a child
REM process that exits non-zero and tears down the whole dev server.
set "BROWSER=none"

echo.
echo === Installing Node dependencies ===
call npm install
if errorlevel 1 (
    echo.
    echo ERROR: npm install failed. Make sure Node.js 18+ is installed and on PATH.
    exit /b 1
)

echo.
echo === Starting React dev server on http://localhost:3000 ===
echo Open that URL in your browser once you see "Compiled successfully".
echo Press Ctrl+C to stop.
echo.
call npm start

endlocal
