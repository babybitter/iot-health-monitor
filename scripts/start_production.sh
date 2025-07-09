#!/bin/bash

# 患者健康监测系统 - 生产环境启动脚本

echo "🚀 启动患者健康监测系统生产环境..."

# 检查EMQX服务
echo "检查EMQX服务状态..."
sudo systemctl start emqx
sudo systemctl enable emqx

# 检查端口
echo "检查端口状态..."
sudo netstat -tlnp | grep -E "(1883|8083)"

# 配置防火墙
echo "配置防火墙..."
sudo ufw allow 1883/tcp
sudo ufw allow 8083/tcp
sudo ufw --force enable

# 显示系统信息
echo "========================================"
echo "  患者健康监测系统 - 生产环境"
echo "========================================"
echo "服务器IP: 47.122.130.135"
echo "MQTT端口: 1883 (TCP)"
echo "WebSocket端口: 8083 (WS)"
echo "管理后台: http://47.122.130.135:18083"
echo "用户名: test / 密码: test123"
echo "========================================"
echo "🎉 生产环境启动完成！"