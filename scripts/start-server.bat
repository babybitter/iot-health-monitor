@echo off
echo ========================================
echo 物联网监测系统 - 后端服务启动
echo ========================================

echo.
echo 正在检查Node.js环境...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 错误: 未找到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js环境检查通过
echo.

echo 正在安装依赖包...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ 依赖包安装失败
    pause
    exit /b 1
)

echo ✅ 依赖包安装完成
echo.

echo 正在启动后端服务...
echo.
echo 🚀 服务器将在 http://localhost:3000 启动
echo 📊 数据管理后台: http://localhost:3000
echo 📡 API接口: http://localhost:3000/api/health
echo.
echo 按 Ctrl+C 停止服务器
echo.

node server/app.js

pause
