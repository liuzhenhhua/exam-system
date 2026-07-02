@echo off
chcp 65001 >nul
echo ========================================
echo   企业在线考试系统 v2.0
echo   Node.js 后端启动中...
echo ========================================
echo.
cd /d "%~dp0server"
:: 如果 3000 端口被占用，自动切换到 3001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do (
    echo [警告] 端口 3000 已被占用，将使用端口 3001
    set PORT=3001
)
if not defined PORT set PORT=3000
echo 启动端口: %PORT%
echo.
node index.js
pause
