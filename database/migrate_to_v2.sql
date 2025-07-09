-- 数据库迁移脚本 v1.0 -> v2.0
-- 用于更新现有数据库结构以匹配新的功能需求
-- 执行前请备份数据库！

USE iot_monitor;

-- 检查当前数据库版本
SELECT 'Starting migration to v2.0...' as status;

-- 1. 添加新的传感器数据字段
-- 添加气压字段
ALTER TABLE sensor_data 
ADD COLUMN IF NOT EXISTS pressure DECIMAL(7,2) NULL COMMENT '气压(hPa)' 
AFTER humidity;

-- 添加心跳字段
ALTER TABLE sensor_data 
ADD COLUMN IF NOT EXISTS heart_rate INT NULL COMMENT '心跳频率(次/分)' 
AFTER breathing_rate;

-- 重命名血氧字段以保持一致性
ALTER TABLE sensor_data 
CHANGE COLUMN spo2 blood_oxygen INT NULL COMMENT '血氧饱和度(%)';

-- 删除不再使用的CO2字段（如果存在）
-- 注意：如果您的系统中还在使用CO2数据，请注释掉下面这行
-- ALTER TABLE sensor_data DROP COLUMN IF EXISTS co2;

-- 2. 更新告警记录表的枚举值
ALTER TABLE alert_records 
MODIFY COLUMN alert_type ENUM('temperature', 'humidity', 'pressure', 'light', 'breathing', 'heartRate', 'bloodOxygen', 'system') NOT NULL COMMENT '告警类型';

-- 3. 更新数据统计表结构
-- 添加气压统计字段
ALTER TABLE data_statistics 
ADD COLUMN IF NOT EXISTS avg_pressure DECIMAL(7,2) NULL COMMENT '平均气压' AFTER min_humidity,
ADD COLUMN IF NOT EXISTS max_pressure DECIMAL(7,2) NULL COMMENT '最高气压' AFTER avg_pressure,
ADD COLUMN IF NOT EXISTS min_pressure DECIMAL(7,2) NULL COMMENT '最低气压' AFTER max_pressure;

-- 添加光照统计字段
ALTER TABLE data_statistics 
ADD COLUMN IF NOT EXISTS avg_light DECIMAL(8,2) NULL COMMENT '平均光照' AFTER min_pressure,
ADD COLUMN IF NOT EXISTS max_light DECIMAL(8,2) NULL COMMENT '最高光照' AFTER avg_light,
ADD COLUMN IF NOT EXISTS min_light DECIMAL(8,2) NULL COMMENT '最低光照' AFTER max_light;

-- 添加呼吸统计字段
ALTER TABLE data_statistics 
ADD COLUMN IF NOT EXISTS avg_breathing DECIMAL(5,2) NULL COMMENT '平均呼吸频率' AFTER min_light,
ADD COLUMN IF NOT EXISTS max_breathing DECIMAL(5,2) NULL COMMENT '最高呼吸频率' AFTER avg_breathing,
ADD COLUMN IF NOT EXISTS min_breathing DECIMAL(5,2) NULL COMMENT '最低呼吸频率' AFTER max_breathing;

-- 添加心跳统计字段
ALTER TABLE data_statistics 
ADD COLUMN IF NOT EXISTS avg_heart_rate DECIMAL(5,2) NULL COMMENT '平均心跳' AFTER min_breathing,
ADD COLUMN IF NOT EXISTS max_heart_rate DECIMAL(5,2) NULL COMMENT '最高心跳' AFTER avg_heart_rate,
ADD COLUMN IF NOT EXISTS min_heart_rate DECIMAL(5,2) NULL COMMENT '最低心跳' AFTER max_heart_rate;

-- 添加血氧统计字段
ALTER TABLE data_statistics 
ADD COLUMN IF NOT EXISTS avg_blood_oxygen DECIMAL(5,2) NULL COMMENT '平均血氧' AFTER min_heart_rate,
ADD COLUMN IF NOT EXISTS max_blood_oxygen DECIMAL(5,2) NULL COMMENT '最高血氧' AFTER avg_blood_oxygen,
ADD COLUMN IF NOT EXISTS min_blood_oxygen DECIMAL(5,2) NULL COMMENT '最低血氧' AFTER max_blood_oxygen;

-- 删除不再使用的CO2统计字段（如果存在）
-- ALTER TABLE data_statistics DROP COLUMN IF EXISTS avg_co2;
-- ALTER TABLE data_statistics DROP COLUMN IF EXISTS max_co2;
-- ALTER TABLE data_statistics DROP COLUMN IF EXISTS min_co2;

-- 4. 更新视图定义
DROP VIEW IF EXISTS v_latest_sensor_data;
CREATE VIEW v_latest_sensor_data AS
SELECT 
    d.device_id,
    d.device_name,
    d.status as device_status,
    -- 环境数据
    s.temperature,
    s.humidity,
    s.pressure,
    s.light_intensity,
    -- 人体数据
    s.breathing_rate,
    s.heart_rate,
    s.blood_oxygen,
    s.created_at as last_update
FROM device_status d
LEFT JOIN sensor_data s ON d.device_id = s.device_id
WHERE s.id = (
    SELECT MAX(id) FROM sensor_data s2 WHERE s2.device_id = d.device_id
);

-- 5. 更新存储过程
DROP PROCEDURE IF EXISTS UpdateHourlyStats;

DELIMITER //
CREATE PROCEDURE UpdateHourlyStats(IN p_device_id VARCHAR(50), IN p_stat_date DATE, IN p_stat_hour TINYINT)
BEGIN
    INSERT INTO data_statistics (
        device_id, stat_date, stat_hour,
        avg_temperature, max_temperature, min_temperature,
        avg_humidity, max_humidity, min_humidity,
        avg_pressure, max_pressure, min_pressure,
        avg_light, max_light, min_light,
        avg_breathing, max_breathing, min_breathing,
        avg_heart_rate, max_heart_rate, min_heart_rate,
        avg_blood_oxygen, max_blood_oxygen, min_blood_oxygen,
        data_count
    )
    SELECT 
        device_id,
        DATE(created_at) as stat_date,
        HOUR(created_at) as stat_hour,
        AVG(temperature), MAX(temperature), MIN(temperature),
        AVG(humidity), MAX(humidity), MIN(humidity),
        AVG(pressure), MAX(pressure), MIN(pressure),
        AVG(light_intensity), MAX(light_intensity), MIN(light_intensity),
        AVG(breathing_rate), MAX(breathing_rate), MIN(breathing_rate),
        AVG(heart_rate), MAX(heart_rate), MIN(heart_rate),
        AVG(blood_oxygen), MAX(blood_oxygen), MIN(blood_oxygen),
        COUNT(*) as data_count
    FROM sensor_data 
    WHERE device_id = p_device_id 
        AND DATE(created_at) = p_stat_date 
        AND HOUR(created_at) = p_stat_hour
    GROUP BY device_id, DATE(created_at), HOUR(created_at)
    ON DUPLICATE KEY UPDATE
        avg_temperature = VALUES(avg_temperature),
        max_temperature = VALUES(max_temperature),
        min_temperature = VALUES(min_temperature),
        avg_humidity = VALUES(avg_humidity),
        max_humidity = VALUES(max_humidity),
        min_humidity = VALUES(min_humidity),
        avg_pressure = VALUES(avg_pressure),
        max_pressure = VALUES(max_pressure),
        min_pressure = VALUES(min_pressure),
        avg_light = VALUES(avg_light),
        max_light = VALUES(max_light),
        min_light = VALUES(min_light),
        avg_breathing = VALUES(avg_breathing),
        max_breathing = VALUES(max_breathing),
        min_breathing = VALUES(min_breathing),
        avg_heart_rate = VALUES(avg_heart_rate),
        max_heart_rate = VALUES(max_heart_rate),
        min_heart_rate = VALUES(min_heart_rate),
        avg_blood_oxygen = VALUES(avg_blood_oxygen),
        max_blood_oxygen = VALUES(max_blood_oxygen),
        min_blood_oxygen = VALUES(min_blood_oxygen),
        data_count = VALUES(data_count),
        updated_at = CURRENT_TIMESTAMP;
END //
DELIMITER ;

-- 6. 验证迁移结果
SELECT 'Migration completed successfully!' as status;
SHOW TABLES;
DESCRIBE sensor_data;
