-- 存储过程文件 (MySQL 5.7兼容版本)
USE iot_monitor;

-- 删除已存在的存储过程
DROP PROCEDURE IF EXISTS UpdateHourlyStats;

-- 创建分隔符
DELIMITER $$

-- 创建统计数据更新存储过程
CREATE PROCEDURE UpdateHourlyStats(
    IN p_device_id VARCHAR(50), 
    IN p_stat_date DATE, 
    IN p_stat_hour TINYINT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- 删除已存在的统计数据
    DELETE FROM data_statistics 
    WHERE device_id = p_device_id 
      AND stat_date = p_stat_date 
      AND stat_hour = p_stat_hour;
    
    -- 插入新的统计数据
    INSERT INTO data_statistics (
        device_id, stat_date, stat_hour,
        avg_temperature, max_temperature, min_temperature,
        avg_humidity, max_humidity, min_humidity,
        avg_co2, max_co2, min_co2,
        data_count
    )
    SELECT 
        p_device_id,
        p_stat_date,
        p_stat_hour,
        ROUND(AVG(temperature), 2) as avg_temperature,
        MAX(temperature) as max_temperature,
        MIN(temperature) as min_temperature,
        ROUND(AVG(humidity), 2) as avg_humidity,
        MAX(humidity) as max_humidity,
        MIN(humidity) as min_humidity,
        ROUND(AVG(co2)) as avg_co2,
        MAX(co2) as max_co2,
        MIN(co2) as min_co2,
        COUNT(*) as data_count
    FROM sensor_data
    WHERE device_id = p_device_id
      AND DATE(created_at) = p_stat_date
      AND HOUR(created_at) = p_stat_hour
      AND temperature IS NOT NULL;
    
    COMMIT;
END$$

-- 恢复分隔符
DELIMITER ;

-- 测试存储过程
SELECT 'Stored procedures created successfully!' as status;
