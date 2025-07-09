-- 物联网监测系统数据库初始化脚本 (MySQL 5.7兼容版本)
-- 创建数据库
CREATE DATABASE IF NOT EXISTS iot_monitor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE iot_monitor;

-- 创建传感器数据表
CREATE TABLE IF NOT EXISTS sensor_data (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    device_id VARCHAR(50) NOT NULL DEFAULT 'default_device' COMMENT '设备ID',
    -- 环境数据
    temperature DECIMAL(5,2) NULL COMMENT '温度(°C)',
    humidity DECIMAL(5,2) NULL COMMENT '湿度(%)',
    pressure DECIMAL(7,2) NULL COMMENT '气压(hPa)',
    light_intensity INT NULL COMMENT '光照强度(lux)',
    -- 人体数据
    breathing_rate INT NULL COMMENT '呼吸频率(次/分)',
    heart_rate INT NULL COMMENT '心跳频率(次/分)',
    blood_oxygen INT NULL COMMENT '血氧饱和度(%)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_device_time (device_id, created_at),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='传感器数据表';

-- 创建设备状态表
CREATE TABLE IF NOT EXISTS device_status (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    device_id VARCHAR(50) NOT NULL UNIQUE COMMENT '设备ID',
    device_name VARCHAR(100) NOT NULL COMMENT '设备名称',
    status ENUM('online', 'offline', 'error') DEFAULT 'offline' COMMENT '设备状态',
    last_heartbeat TIMESTAMP NULL COMMENT '最后心跳时间',
    mqtt_connected BOOLEAN DEFAULT FALSE COMMENT 'MQTT连接状态',
    wifi_signal INT DEFAULT 0 COMMENT 'WiFi信号强度',
    battery_level INT DEFAULT 100 COMMENT '电池电量(%)',
    firmware_version VARCHAR(20) DEFAULT '1.0.0' COMMENT '固件版本',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备状态表';

-- 创建告警记录表
CREATE TABLE IF NOT EXISTS alert_records (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    device_id VARCHAR(50) NOT NULL COMMENT '设备ID',
    alert_type ENUM('temperature', 'humidity', 'co2', 'breathing', 'spo2', 'system') NOT NULL COMMENT '告警类型',
    alert_level ENUM('info', 'warning', 'critical') NOT NULL COMMENT '告警级别',
    alert_message TEXT NOT NULL COMMENT '告警消息',
    sensor_value DECIMAL(10,2) NULL COMMENT '传感器数值',
    threshold_value DECIMAL(10,2) NULL COMMENT '阈值',
    is_resolved BOOLEAN DEFAULT FALSE COMMENT '是否已解决',
    resolved_at TIMESTAMP NULL COMMENT '解决时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_device_type (device_id, alert_type),
    INDEX idx_created_at (created_at),
    INDEX idx_level (alert_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='告警记录表';

-- 创建数据统计表(用于快速查询)
CREATE TABLE IF NOT EXISTS data_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    device_id VARCHAR(50) NOT NULL COMMENT '设备ID',
    stat_date DATE NOT NULL COMMENT '统计日期',
    stat_hour TINYINT NOT NULL COMMENT '统计小时(0-23)',
    avg_temperature DECIMAL(5,2) NULL COMMENT '平均温度',
    max_temperature DECIMAL(5,2) NULL COMMENT '最高温度',
    min_temperature DECIMAL(5,2) NULL COMMENT '最低温度',
    avg_humidity DECIMAL(5,2) NULL COMMENT '平均湿度',
    max_humidity DECIMAL(5,2) NULL COMMENT '最高湿度',
    min_humidity DECIMAL(5,2) NULL COMMENT '最低湿度',
    avg_co2 INT NULL COMMENT '平均CO2',
    max_co2 INT NULL COMMENT '最高CO2',
    min_co2 INT NULL COMMENT '最低CO2',
    data_count INT DEFAULT 0 COMMENT '数据条数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_device_date_hour (device_id, stat_date, stat_hour),
    INDEX idx_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据统计表';

-- 插入默认设备
INSERT INTO device_status (device_id, device_name, status) 
VALUES ('default_device', '默认监测设备', 'offline')
ON DUPLICATE KEY UPDATE device_name = VALUES(device_name);

-- 创建视图：最新传感器数据
DROP VIEW IF EXISTS v_latest_sensor_data;
CREATE VIEW v_latest_sensor_data AS
SELECT 
    d.device_id,
    d.device_name,
    d.status as device_status,
    s.temperature,
    s.humidity,
    s.co2,
    s.breathing_rate,
    s.spo2,
    s.light_intensity,
    s.created_at as last_update
FROM device_status d
LEFT JOIN sensor_data s ON d.device_id = s.device_id
WHERE s.id = (
    SELECT MAX(id) FROM sensor_data s2 WHERE s2.device_id = d.device_id
);

-- 显示创建结果
SHOW TABLES;
SELECT 'Database initialization completed successfully!' as status;
