@echo off
REM ---------------------------------------------------------------------------
REM Start the AI Code Reviewer backend (FastAPI + Uvicorn).
REM
REM Prerequisites:
REM   * Python 3.9+ on PATH
REM   * A .env file in this folder (copy from .env.example and fill in values)
REM ---------------------------------------------------------------------------

setlocal

cd /d "%~dp0"

echo.
echo === Installing Python dependencies ===
pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo ERROR: pip install failed. Make sure Python 3.9+ is installed and on PATH.
    exit /b 1
)

echo.
echo === Starting Uvicorn on http://localhost:8000 ===
echo Press Ctrl+C to stop.
echo.
uvicorn main:app --reload --host 0.0.0.0 --port 8000

endlocal
