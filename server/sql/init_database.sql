-- IoT监测系统数据库初始化脚本
-- 请在MySQL中执行此脚本来创建完整的数据库结构

-- 创建数据库
CREATE DATABASE IF NOT EXISTS iot_monitor 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

USE iot_monitor;

-- 1. 传感器数据表
CREATE TABLE IF NOT EXISTS sensor_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL DEFAULT 'default_device' COMMENT '设备ID',
    bed_id VARCHAR(50) NULL COMMENT '关联床位ID',
    temperature DECIMAL(5,2) NULL COMMENT '温度(℃)',
    humidity DECIMAL(5,2) NULL COMMENT '湿度(%)',
    co2 DECIMAL(8,2) NULL COMMENT 'CO2浓度(ppm)',
    breathing_rate INT NULL COMMENT '呼吸频率(次/分)',
    spo2 DECIMAL(5,2) NULL COMMENT '血氧饱和度(%)',
    light_intensity DECIMAL(10,2) NULL COMMENT '光照强度(lux)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    INDEX idx_device_id (device_id),
    INDEX idx_bed_id (bed_id),
    INDEX idx_created_at (created_at),
    INDEX idx_device_bed (device_id, bed_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='传感器数据表';

-- 2. 设备状态表
CREATE TABLE IF NOT EXISTS device_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL UNIQUE COMMENT '设备ID',
    status ENUM('online', 'offline', 'error') DEFAULT 'offline' COMMENT '设备状态',
    last_heartbeat TIMESTAMP NULL COMMENT '最后心跳时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_status (status),
    INDEX idx_last_heartbeat (last_heartbeat)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备状态表';

-- 3. 告警记录表
CREATE TABLE IF NOT EXISTS alert_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL COMMENT '设备ID',
    alert_type VARCHAR(50) NOT NULL COMMENT '告警类型',
    alert_level ENUM('info', 'warning', 'error', 'critical') DEFAULT 'warning' COMMENT '告警级别',
    alert_message TEXT NOT NULL COMMENT '告警消息',
    sensor_value DECIMAL(10,2) NULL COMMENT '传感器值',
    threshold_value DECIMAL(10,2) NULL COMMENT '阈值',
    is_resolved BOOLEAN DEFAULT FALSE COMMENT '是否已解决',
    resolved_at TIMESTAMP NULL COMMENT '解决时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    INDEX idx_device_id (device_id),
    INDEX idx_alert_type (alert_type),
    INDEX idx_alert_level (alert_level),
    INDEX idx_created_at (created_at),
    INDEX idx_is_resolved (is_resolved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='告警记录表';

-- 4. 床位信息表
CREATE TABLE IF NOT EXISTS bed_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bed_id VARCHAR(50) NOT NULL UNIQUE COMMENT '床位ID',
    room_number VARCHAR(20) NOT NULL COMMENT '房间号',
    bed_number VARCHAR(10) NOT NULL COMMENT '床位号',
    department VARCHAR(50) NULL COMMENT '科室',
    bed_type ENUM('standard', 'icu', 'emergency') DEFAULT 'standard' COMMENT '床位类型',
    status ENUM('active', 'maintenance', 'disabled') DEFAULT 'active' COMMENT '床位状态',
    device_id VARCHAR(100) NULL COMMENT '关联设备ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_room_number (room_number),
    INDEX idx_bed_type (bed_type),
    INDEX idx_status (status),
    INDEX idx_device_id (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='床位基础信息表';

-- 5. 床位状态表
CREATE TABLE IF NOT EXISTS bed_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bed_id VARCHAR(50) NOT NULL COMMENT '床位ID',
    device_id VARCHAR(100) NOT NULL DEFAULT 'default_device' COMMENT '设备ID',
    presence ENUM('in_bed', 'out_of_bed') NOT NULL COMMENT '在床状态',
    patient_id VARCHAR(50) NULL COMMENT '患者ID（可选）',
    room_number VARCHAR(20) NULL COMMENT '房间号（可选）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_bed_id (bed_id),
    INDEX idx_device_id (device_id),
    INDEX idx_created_at (created_at),
    INDEX idx_presence (presence)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='床位状态记录表';

-- 6. 床位状态历史表
CREATE TABLE IF NOT EXISTS bed_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bed_id VARCHAR(50) NOT NULL COMMENT '床位ID',
    device_id VARCHAR(100) NOT NULL DEFAULT 'default_device' COMMENT '设备ID',
    presence ENUM('in_bed', 'out_of_bed') NOT NULL COMMENT '在床状态',
    duration_minutes INT NULL COMMENT '持续时间（分钟）',
    start_time TIMESTAMP NOT NULL COMMENT '开始时间',
    end_time TIMESTAMP NULL COMMENT '结束时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    INDEX idx_bed_id (bed_id),
    INDEX idx_device_id (device_id),
    INDEX idx_start_time (start_time),
    INDEX idx_presence (presence)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='床位状态历史记录表';

-- 插入初始数据
INSERT INTO device_status (device_id, status) 
VALUES ('default_device', 'offline')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO bed_info (bed_id, room_number, bed_number, department, device_id) 
VALUES ('301', '301', '1', '内科', 'default_device')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 创建视图
CREATE OR REPLACE VIEW bed_status_stats AS
SELECT 
    b.bed_id,
    b.room_number,
    b.bed_number,
    bs.presence as current_status,
    bs.created_at as last_update,
    COALESCE(
        (SELECT SUM(duration_minutes) 
         FROM bed_status_history bsh 
         WHERE bsh.bed_id = b.bed_id 
           AND bsh.presence = 'in_bed' 
           AND DATE(bsh.start_time) = CURDATE()), 0
    ) as today_in_bed_minutes,
    COALESCE(
        (SELECT SUM(duration_minutes) 
         FROM bed_status_history bsh 
         WHERE bsh.bed_id = b.bed_id 
           AND bsh.presence = 'out_of_bed' 
           AND DATE(bsh.start_time) = CURDATE()), 0
    ) as today_out_bed_minutes
FROM bed_info b
LEFT JOIN bed_status bs ON b.bed_id = bs.bed_id
WHERE b.status = 'active';

SELECT '✅ 数据库初始化完成！' as message;
