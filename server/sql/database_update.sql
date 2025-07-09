-- 数据库更新脚本 - 添加床位状态支持
-- 执行前请备份现有数据库

-- 1. 创建床位状态表
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

-- 2. 创建床位状态历史表（用于统计分析）
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

-- 3. 更新现有的sensor_data表，添加床位相关字段（可选）
ALTER TABLE sensor_data 
ADD COLUMN bed_id VARCHAR(50) NULL COMMENT '关联床位ID' AFTER device_id,
ADD INDEX idx_bed_id (bed_id);

-- 4. 创建床位信息表（床位基础信息）
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

-- 5. 插入示例床位信息
INSERT INTO bed_info (bed_id, room_number, bed_number, department, device_id) 
VALUES ('301', '301', '1', '内科', 'default_device')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 6. 创建床位状态触发器（自动记录历史）
DELIMITER $$

CREATE TRIGGER IF NOT EXISTS bed_status_history_trigger
AFTER INSERT ON bed_status
FOR EACH ROW
BEGIN
    -- 结束上一个状态记录
    UPDATE bed_status_history 
    SET end_time = NEW.created_at,
        duration_minutes = TIMESTAMPDIFF(MINUTE, start_time, NEW.created_at)
    WHERE bed_id = NEW.bed_id 
      AND end_time IS NULL;
    
    -- 插入新的状态记录
    INSERT INTO bed_status_history (bed_id, device_id, presence, start_time)
    VALUES (NEW.bed_id, NEW.device_id, NEW.presence, NEW.created_at);
END$$

DELIMITER ;

-- 7. 创建视图：床位状态统计
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

-- 8. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_sensor_data_created_at ON sensor_data(created_at);
CREATE INDEX IF NOT EXISTS idx_sensor_data_device_bed ON sensor_data(device_id, bed_id);

-- 完成提示
SELECT '✅ 数据库更新完成！床位状态功能已启用。' as message;
