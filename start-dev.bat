@echo off
title LGU HRMS Development Launcher

echo Starting HRMS Backend...
start "HRMS Backend" powershell -Command "cd 'C:\Users\itcub\Desktop\Projects\lgu_hrms\backend'; npm run dev"

timeout /t 3 /nobreak >nul

echo Starting HRMS Frontend...
start "HRMS Frontend" powershell -Command "cd 'C:\Users\itcub\Desktop\Projects\lgu_hrms\frontend'; npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo HRMS Backend: http://localhost:4000
echo HRMS Frontend: http://localhost:5173
echo.
echo Close this window to stop all services.
pause
