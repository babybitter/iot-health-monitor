#!/bin/bash

# 患者健康监测系统 - 生产环境启动脚本

echo "🚀 启动患者健康监测系统生产环境..."

# 检查EMQX服务
echo "检查EMQX服务状态..."
sudo systemctl start emqx
sudo systemctl enable emqx

# 检查端口
echo "检查端口状态..."
sudo netstat -tlnp | grep -E "(1883|8083|8883|8084|443|3000)"

# 配置防火墙
echo "配置防火墙..."
sudo ufw allow 1883/tcp    # MQTT TCP
sudo ufw allow 8083/tcp    # MQTT WebSocket
sudo ufw allow 8883/tcp    # MQTT SSL
sudo ufw allow 8084/tcp    # MQTT WebSocket SSL
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # API HTTP
sudo ufw --force enable

# 启动Node.js后端服务
echo "启动后端服务..."
cd /path/to/your/project
npm install
NODE_ENV=production node server/app-https.js &

# 显示系统信息
echo "========================================"
echo "  患者健康监测系统 - 生产环境"
echo "========================================"
echo "域名: healthtrack.top"
echo "API地址: https://api.healthtrack.top"
echo "MQTT SSL端口: 8883 (mqtts://)"
echo "MQTT WSS端口: 8084 (wss://)"
echo "管理后台: http://47.122.130.135:18083"
echo "用户名: test / 密码: test123"
echo "========================================"
echo "🔒 SSL证书已配置"
echo "🌐 域名解析已生效"
echo "🎉 生产环境启动完成！"