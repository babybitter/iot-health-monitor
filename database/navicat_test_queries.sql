-- Navicat Premium 16 测试查询脚本
-- 物联网监测系统数据库操作示例

-- ========================================
-- 1. 数据库基础查询
-- ========================================

-- 查看所有表
SHOW TABLES;

-- 查看表结构
DESCRIBE sensor_data;
DESCRIBE device_status;
DESCRIBE alert_records;

-- 查看表状态
SHOW TABLE STATUS;

-- ========================================
-- 2. 插入测试数据
-- ========================================

-- 插入设备状态
INSERT INTO device_status (device_id, device_name, status) 
VALUES ('test_device_01', '测试设备01', 'online')
ON DUPLICATE KEY UPDATE 
    device_name = VALUES(device_name),
    status = VALUES(status),
    last_heartbeat = NOW();

-- 插入传感器测试数据
INSERT INTO sensor_data (
    device_id, temperature, humidity, co2, 
    breathing_rate, spo2, light_intensity
) VALUES 
('test_device_01', 36.5, 65.2, 420, 18, 98, 350),
('test_device_01', 36.8, 64.1, 430, 17, 97, 340),
('test_device_01', 37.0, 66.3, 440, 19, 96, 360),
('test_device_01', 36.9, 65.8, 435, 18, 98, 355),
('test_device_01', 36.7, 64.9, 425, 17, 97, 345);

-- 插入告警测试数据
INSERT INTO alert_records (
    device_id, alert_type, alert_level, 
    alert_message, sensor_value, threshold_value
) VALUES 
('test_device_01', 'temperature', 'warning', '体温偏高', 37.8, 37.5),
('test_device_01', 'co2', 'warning', 'CO2浓度过高', 1200, 1000),
('test_device_01', 'spo2', 'critical', '血氧饱和度过低', 92, 95);

-- ========================================
-- 3. 基础数据查询
-- ========================================

-- 查看最新10条传感器数据
SELECT 
    id,
    device_id,
    temperature,
    humidity,
    co2,
    breathing_rate,
    spo2,
    light_intensity,
    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_time
FROM sensor_data 
ORDER BY created_at DESC 
LIMIT 10;

-- 查看设备状态
SELECT 
    device_id,
    device_name,
    status,
    mqtt_connected,
    DATE_FORMAT(last_heartbeat, '%Y-%m-%d %H:%i:%s') as last_heartbeat_time,
    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_time
FROM device_status;

-- 查看最新告警
SELECT 
    device_id,
    alert_type,
    alert_level,
    alert_message,
    sensor_value,
    threshold_value,
    is_resolved,
    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as alert_time
FROM alert_records 
ORDER BY created_at DESC 
LIMIT 10;

-- ========================================
-- 4. 统计分析查询
-- ========================================

-- 按设备统计数据条数
SELECT 
    device_id,
    COUNT(*) as data_count,
    MIN(created_at) as first_data,
    MAX(created_at) as last_data
FROM sensor_data 
GROUP BY device_id;

-- 最近24小时温度统计
SELECT 
    device_id,
    AVG(temperature) as avg_temp,
    MAX(temperature) as max_temp,
    MIN(temperature) as min_temp,
    COUNT(*) as data_count
FROM sensor_data 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY device_id;

-- 按小时统计数据
SELECT 
    DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour,
    AVG(temperature) as avg_temp,
    AVG(humidity) as avg_humidity,
    AVG(co2) as avg_co2,
    COUNT(*) as data_count
FROM sensor_data 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H')
ORDER BY hour DESC;

-- 告警统计
SELECT 
    alert_type,
    alert_level,
    COUNT(*) as alert_count,
    MAX(created_at) as last_alert
FROM alert_records 
GROUP BY alert_type, alert_level
ORDER BY alert_count DESC;

-- ========================================
-- 5. 高级查询示例
-- ========================================

-- 查找异常数据
SELECT 
    device_id,
    temperature,
    humidity,
    co2,
    created_at,
    CASE 
        WHEN temperature > 38 THEN '高温'
        WHEN temperature < 35 THEN '低温'
        WHEN co2 > 1000 THEN '高CO2'
        WHEN spo2 < 95 THEN '低血氧'
        ELSE '正常'
    END as status
FROM sensor_data 
WHERE temperature > 38 OR temperature < 35 OR co2 > 1000 OR spo2 < 95
ORDER BY created_at DESC;

-- 数据趋势分析（最近7天每日平均值）
SELECT 
    DATE(created_at) as date,
    AVG(temperature) as avg_temp,
    AVG(humidity) as avg_humidity,
    AVG(co2) as avg_co2,
    AVG(spo2) as avg_spo2,
    COUNT(*) as data_count
FROM sensor_data 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 设备在线时长统计
SELECT 
    device_id,
    device_name,
    status,
    TIMESTAMPDIFF(MINUTE, created_at, COALESCE(last_heartbeat, NOW())) as online_minutes,
    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as first_online,
    DATE_FORMAT(last_heartbeat, '%Y-%m-%d %H:%i:%s') as last_heartbeat_time
FROM device_status;

-- ========================================
-- 6. 数据维护查询
-- ========================================

-- 查看表大小和行数
SELECT 
    table_name,
    table_rows,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
FROM information_schema.tables 
WHERE table_schema = 'iot_monitor';

-- 查看索引使用情况
SHOW INDEX FROM sensor_data;
SHOW INDEX FROM alert_records;

-- 分析表性能
ANALYZE TABLE sensor_data;
ANALYZE TABLE alert_records;

-- ========================================
-- 7. 数据清理查询（谨慎使用）
-- ========================================

-- 查看可清理的数据量（30天前）
SELECT 
    COUNT(*) as old_data_count,
    MIN(created_at) as oldest_data,
    MAX(created_at) as newest_old_data
FROM sensor_data 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 清理30天前的数据（取消注释后执行）
-- DELETE FROM sensor_data 
-- WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 清理已解决的告警（7天前）
-- DELETE FROM alert_records 
-- WHERE is_resolved = TRUE 
--   AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- ========================================
-- 8. 性能优化查询
-- ========================================

-- 创建常用索引
CREATE INDEX IF NOT EXISTS idx_sensor_device_time ON sensor_data(device_id, created_at);
CREATE INDEX IF NOT EXISTS idx_alert_type_time ON alert_records(alert_type, created_at);
CREATE INDEX IF NOT EXISTS idx_alert_level ON alert_records(alert_level);

-- 查看慢查询（需要开启慢查询日志）
-- SHOW VARIABLES LIKE 'slow_query_log';
-- SHOW VARIABLES LIKE 'long_query_time';

-- 优化表
OPTIMIZE TABLE sensor_data;
OPTIMIZE TABLE alert_records;

-- ========================================
-- 9. 实用视图和存储过程测试
-- ========================================

-- 测试最新数据视图
SELECT * FROM v_latest_sensor_data;

-- 测试小时统计存储过程
CALL UpdateHourlyStats('test_device_01', CURDATE(), HOUR(NOW()));

-- 查看统计结果
SELECT * FROM data_statistics 
WHERE device_id = 'test_device_01' 
ORDER BY stat_date DESC, stat_hour DESC 
LIMIT 5;

-- ========================================
-- 10. 数据验证查询
-- ========================================

-- 验证数据完整性
SELECT 
    'sensor_data' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT device_id) as unique_devices,
    MIN(created_at) as earliest_data,
    MAX(created_at) as latest_data
FROM sensor_data
UNION ALL
SELECT 
    'alert_records' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT device_id) as unique_devices,
    MIN(created_at) as earliest_data,
    MAX(created_at) as latest_data
FROM alert_records;

-- 检查数据质量
SELECT 
    'Temperature NULL' as issue,
    COUNT(*) as count
FROM sensor_data WHERE temperature IS NULL
UNION ALL
SELECT 
    'Humidity NULL' as issue,
    COUNT(*) as count
FROM sensor_data WHERE humidity IS NULL
UNION ALL
SELECT 
    'CO2 NULL' as issue,
    COUNT(*) as count
FROM sensor_data WHERE co2 IS NULL;

-- 查询完成提示
SELECT '🎉 Navicat测试查询脚本执行完成！' as message;
