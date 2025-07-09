#!/bin/bash

# 健康监测系统监控脚本
# 用于生产环境监控EMQX和系统状态

LOG_FILE="/var/log/healthtrack/monitor.log"
EMAIL="admin@healthtrack.top"

# 创建日志目录
sudo mkdir -p /var/log/healthtrack

# 记录日志函数
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# 检查EMQX状态
check_emqx() {
    if systemctl is-active --quiet emqx; then
        log_message "EMQX服务正常运行"
        return 0
    else
        log_message "ERROR: EMQX服务未运行"
        # 尝试重启
        sudo systemctl restart emqx
        sleep 10
        if systemctl is-active --quiet emqx; then
            log_message "EMQX服务重启成功"
        else
            log_message "CRITICAL: EMQX服务重启失败"
            # 发送告警邮件
            echo "EMQX服务异常，请立即检查" | mail -s "健康监测系统告警" $EMAIL
        fi
        return 1
    fi
}

# 检查端口状态
check_ports() {
    ports=(1883 8083 8084 8883 18083)
    for port in "${ports[@]}"; do
        if netstat -tuln | grep -q ":$port "; then
            log_message "端口 $port 正常监听"
        else
            log_message "WARNING: 端口 $port 未监听"
        fi
    done
}

# 检查SSL证书
check_ssl_cert() {
    cert_file="/etc/letsencrypt/live/mqtt.healthtrack.top/fullchain.pem"
    if [ -f "$cert_file" ]; then
        # 检查证书过期时间
        expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
        expiry_timestamp=$(date -d "$expiry_date" +%s)
        current_timestamp=$(date +%s)
        days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [ $days_until_expiry -lt 30 ]; then
            log_message "WARNING: SSL证书将在 $days_until_expiry 天后过期"
            echo "SSL证书即将过期，剩余天数: $days_until_expiry" | mail -s "SSL证书过期告警" $EMAIL
        else
            log_message "SSL证书正常，剩余 $days_until_expiry 天"
        fi
    else
        log_message "ERROR: SSL证书文件不存在"
    fi
}

# 检查系统资源
check_system_resources() {
    # CPU使用率
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    log_message "CPU使用率: ${cpu_usage}%"
    
    # 内存使用率
    memory_usage=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
    log_message "内存使用率: ${memory_usage}%"
    
    # 磁盘使用率
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | cut -d'%' -f1)
    log_message "磁盘使用率: ${disk_usage}%"
    
    # 检查告警阈值
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        log_message "WARNING: CPU使用率过高"
    fi
    
    if (( $(echo "$memory_usage > 80" | bc -l) )); then
        log_message "WARNING: 内存使用率过高"
    fi
    
    if [ $disk_usage -gt 80 ]; then
        log_message "WARNING: 磁盘使用率过高"
    fi
}

# 检查MQTT连接数
check_mqtt_connections() {
    if command -v emqx &> /dev/null; then
        connections=$(emqx ctl broker stats | grep "connections.count" | awk '{print $2}')
        log_message "当前MQTT连接数: $connections"
    fi
}

# 主监控函数
main() {
    log_message "开始系统监控检查"
    
    check_emqx
    check_ports
    check_ssl_cert
    check_system_resources
    check_mqtt_connections
    
    log_message "监控检查完成"
    echo "---" >> $LOG_FILE
}

# 执行监控
main
