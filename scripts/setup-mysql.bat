@echo off
echo ========================================
echo 物联网监测系统 - MySQL数据库初始化
echo ========================================

echo.
echo 正在初始化MySQL数据库...
echo.

REM 设置MySQL路径
set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe"

REM 检查MySQL是否存在
if not exist %MYSQL_PATH% (
    echo 错误: 找不到MySQL，请确认安装路径是否正确
    echo 当前查找路径: %MYSQL_PATH%
    pause
    exit /b 1
)

echo 找到MySQL: %MYSQL_PATH%
echo.

REM 提示输入密码
echo 请输入MySQL root用户密码:
%MYSQL_PATH% -u root -p < database/init.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 数据库初始化成功！
    echo.
    echo 创建的数据库: iot_monitor
    echo 创建的表:
    echo   - sensor_data (传感器数据表)
    echo   - device_status (设备状态表) 
    echo   - alert_records (告警记录表)
    echo   - data_statistics (数据统计表)
    echo.
) else (
    echo.
    echo ❌ 数据库初始化失败！
    echo 请检查:
    echo 1. MySQL服务是否启动
    echo 2. root密码是否正确
    echo 3. 是否有创建数据库的权限
    echo.
)

pause
