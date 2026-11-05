@echo off
cd /d "%~dp0"
echo Installing dependencies...
call npm install
if errorlevel 1 goto err
echo Building Windows app...
call npm run dist
if errorlevel 1 goto err
echo.
echo Done! Your files are in the "dist" folder.
explorer dist
pause
exit /b
:err
echo.
echo Build failed. Copy the message above and send it to Claude.
pause
