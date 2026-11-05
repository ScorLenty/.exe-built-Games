@echo off
cd /d "%~dp0"
echo Checking dependencies...
call npm install
if errorlevel 1 goto err
call npm start
exit /b
:err
echo Install failed. Copy the message above and send it to Claude.
pause
