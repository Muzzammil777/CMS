@echo off
setlocal EnableDelayedExpansion

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
  
echo =============================================
echo MIT Connect startup script
echo =============================================
echo.

cd /d "%ROOT_DIR%"
if errorlevel 1 (
  echo Failed to switch to root directory.
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo frontend\package.json not found. Frontend startup cannot continue.
  exit /b 1
)

echo [1/5] Installing frontend dependencies...
cd /d "%FRONTEND_DIR%"
call npm install
if errorlevel 1 (
  echo Frontend dependency installation failed.
  exit /b 1
)

if exist "%BACKEND_DIR%\requirements.txt" (
  echo [2/5] Backend will run with FastAPI Python stack.
  rem Prefer `python` on PATH, otherwise fall back to `py -3` launcher if available
  set "PY_CMD=python"
  where python >nul 2>nul
  if !errorlevel! NEQ 0 (
    where py >nul 2>nul
    if !errorlevel! EQU 0 (
      set "PY_CMD=py -3"
    )
  )
  if defined PY_CMD (
    echo [3/5] Installing backend Python dependencies using %PY_CMD%...
    cd /d "%BACKEND_DIR%"
    %PY_CMD% -m pip install -r requirements.txt
  ) else (
    echo [3/5] Python launcher not found. Skipping Python dependency install.
  )
) else (
  echo [3/5] Skipping backend Python dependency install - requirements.txt not found.
)

echo [4/5] Starting backend server...

if exist "%BACKEND_DIR%\main.py" (
  if defined PY_CMD (
    start "MIT Connect Backend (FastAPI)" cmd /k "cd /d ""%ROOT_DIR%"" && %PY_CMD% -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 5000"
  ) else (
    start "MIT Connect Backend (FastAPI)" cmd /k "cd /d ""%ROOT_DIR%"" && python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 5000"
  )
) else (
  echo backend\main.py not found. FastAPI backend was not started.
)

echo [5/5] Starting frontend server...
start "MIT Connect Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev"

echo.
echo Both services were started in separate terminal windows.
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:5000
echo Close those windows to stop the servers.
echo.

endlocal
