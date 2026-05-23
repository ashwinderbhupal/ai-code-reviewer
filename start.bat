@echo off
REM ---------------------------------------------------------------------------
REM AI Code Reviewer — quick start instructions.
REM
REM This script does NOT launch the servers automatically because the
REM backend and frontend should each run in their own terminal so you can
REM read their logs independently.
REM ---------------------------------------------------------------------------

echo.
echo ============================================================
echo   AI Code Reviewer - To start this project:
echo ============================================================
echo.
echo   1. Fill in backend\.env with your credentials
echo        (copy backend\.env.example to backend\.env and edit it).
echo.
echo   2. Run backend\run.bat in one terminal
echo        - Installs Python dependencies
echo        - Starts FastAPI on http://localhost:8000
echo.
echo   3. Run frontend\run.bat in another terminal
echo        - Installs Node dependencies
echo        - Starts React dev server on http://localhost:3000
echo.
echo   4. Open http://localhost:3000 in your browser.
echo.
echo ============================================================
echo.

pause
