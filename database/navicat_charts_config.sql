-- Navicat Premium 16 图表配置SQL
-- 用于创建数据可视化图表的查询语句

-- ========================================
-- 1. 实时监控图表
-- ========================================

-- 最近24小时温度趋势图
-- 图表类型：折线图
-- X轴：时间 Y轴：温度
SELECT 
    DATE_FORMAT(created_at, '%m-%d %H:%i') as time_label,
    AVG(temperature) as temperature,
    device_id
FROM sensor_data 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
  AND temperature IS NOT NULL
GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:%i'), device_id
ORDER BY created_at;

-- 最近24小时湿度趋势图
-- 图表类型：折线图
-- X轴：时间 Y轴：湿度
SELECT 
    DATE_FORMAT(created_at, '%m-%d %H:%i') as time_label,
    AVG(humidity) as humidity,
    device_id
FROM sensor_data 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
  AND humidity IS NOT NULL
GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:%i'), device_id
ORDER BY created_at;

-- 最近24小时CO2浓度趋势图
-- 图表类型：折线图
-- X轴：时间 Y轴：CO2浓度
SELECT 
    DATE_FORMAT(created_at, '%m-%d %H:%i') as time_label,
    AVG(co2) as co2_level,
    device_id
FROM sensor_data 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
  AND co2 IS NOT NULL
GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:%i'), device_id
ORDER BY created_at;

-- ========================================
-- 2. 多参数对比图表
-- ========================================

-- 最近12小时多参数趋势对比
-- 图表类型：多轴折线图
-- 左Y轴：温度、湿度 右Y轴：CO2
SELECT 
    DATE_FORMAT(created_at, '%H:%i') as time_label,
    AVG(temperature) as temperature,
    AVG(humidity) as humidity,
    AVG(co2) as co2_level,
    AVG(spo2) as spo2_level
FROM sensor_data 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 HOUR)
GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:%i')
ORDER BY created_at;

-- 设备状态分布饼图
-- 图表类型：饼图
-- 数据：在线/离线设备数量
SELECT 
    status as device_status,
    COUNT(*) as device_count
FROM device_status 
GROUP BY status;

-- ========================================
-- 3. 统计分析图表
-- ========================================

-- 最近7天每日平均值柱状图
-- 图表类型：柱状图
-- X轴：日期 Y轴：平均值
SELECT 
    DATE_FORMAT(created_at, '%m-%d') as date_label,
    AVG(temperature) as avg_temperature,
    AVG(humidity) as avg_humidity,
    AVG(co2) as avg_co2,
    COUNT(*) as data_count
FROM sensor_data 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY created_at;

-- 每小时数据量统计
-- 图表类型：柱状图
-- X轴：小时 Y轴：数据条数
SELECT 
    HOUR(created_at) as hour_of_day,
    COUNT(*) as data_count,
    AVG(temperature) as avg_temp
FROM sensor_data 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY HOUR(created_at)
ORDER BY hour_of_day;

-- ========================================
-- 4. 告警分析图表
-- ========================================

-- 告警类型分布饼图
-- 图表类型：饼图
-- 数据：各类型告警数量
SELECT 
    alert_type,
    COUNT(*) as alert_count
FROM alert_records 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY alert_type;

-- 告警级别分布柱状图
-- 图表类型：柱状图
-- X轴：告警级别 Y轴：告警数量
SELECT 
    alert_level,
    COUNT(*) as alert_count
FROM alert_records 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY alert_level
ORDER BY 
    CASE alert_level 
        WHEN 'critical' THEN 1
        WHEN 'warning' THEN 2
        WHEN 'info' THEN 3
    END;

-- 每日告警趋势图
-- 图表类型：折线图
-- X轴：日期 Y轴：告警数量
SELECT 
    DATE_FORMAT(created_at, '%m-%d') as date_label,
    COUNT(*) as daily_alerts,
    SUM(CASE WHEN alert_level = 'critical' THEN 1 ELSE 0 END) as critical_alerts,
    SUM(CASE WHEN alert_level = 'warning' THEN 1 ELSE 0 END) as warning_alerts
FROM alert_records 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY created_at;

-- ========================================
-- 5. 设备性能图表
-- ========================================

-- 设备数据上报频率
-- 图表类型：柱状图
-- X轴：设备ID Y轴：数据条数
SELECT 
    device_id,
    COUNT(*) as data_count,
    COUNT(DISTINCT DATE(created_at)) as active_days,
    ROUND(COUNT(*) / COUNT(DISTINCT DATE(created_at)), 2) as avg_daily_reports
FROM sensor_data 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY device_id
ORDER BY data_count DESC;

-- 设备在线时长分析
-- 图表类型：柱状图
-- X轴：设备名称 Y轴：在线小时数
SELECT 
    device_name,
    status,
    ROUND(TIMESTAMPDIFF(MINUTE, created_at, COALESCE(last_heartbeat, NOW())) / 60, 2) as online_hours
FROM device_status
ORDER BY online_hours DESC;

-- ========================================
-- 6. 数据质量图表
-- ========================================

-- 数据完整性分析
-- 图表类型：堆叠柱状图
-- X轴：数据字段 Y轴：完整性百分比
SELECT 
    'Temperature' as field_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN temperature IS NOT NULL THEN 1 ELSE 0 END) as valid_records,
    ROUND(SUM(CASE WHEN temperature IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completeness_percent
FROM sensor_data
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)

UNION ALL

SELECT 
    'Humidity' as field_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN humidity IS NOT NULL THEN 1 ELSE 0 END) as valid_records,
    ROUND(SUM(CASE WHEN humidity IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completeness_percent
FROM sensor_data
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)

UNION ALL

SELECT 
    'CO2' as field_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN co2 IS NOT NULL THEN 1 ELSE 0 END) as valid_records,
    ROUND(SUM(CASE WHEN co2 IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completeness_percent
FROM sensor_data
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY);

-- ========================================
-- 7. 实时仪表盘查询
-- ========================================

-- 实时关键指标（用于仪表盘显示）
SELECT 
    'current_temperature' as metric,
    ROUND(AVG(temperature), 1) as value,
    '°C' as unit,
    CASE 
        WHEN AVG(temperature) > 38 THEN 'danger'
        WHEN AVG(temperature) > 37.5 THEN 'warning'
        ELSE 'normal'
    END as status
FROM sensor_data 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
  AND temperature IS NOT NULL

UNION ALL

SELECT 
    'current_humidity' as metric,
    ROUND(AVG(humidity), 1) as value,
    '%' as unit,
    CASE 
        WHEN AVG(humidity) > 80 OR AVG(humidity) < 30 THEN 'warning'
        ELSE 'normal'
    END as status
FROM sensor_data 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
  AND humidity IS NOT NULL

UNION ALL

SELECT 
    'current_co2' as metric,
    ROUND(AVG(co2), 0) as value,
    'ppm' as unit,
    CASE 
        WHEN AVG(co2) > 1000 THEN 'danger'
        WHEN AVG(co2) > 800 THEN 'warning'
        ELSE 'normal'
    END as status
FROM sensor_data 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
  AND co2 IS NOT NULL;

-- ========================================
-- 8. 自定义时间范围查询模板
-- ========================================

-- 自定义时间范围模板（替换日期使用）
-- 使用方法：将 '2024-01-01' 和 '2024-01-31' 替换为实际日期
SELECT 
    DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour_period,
    AVG(temperature) as avg_temp,
    MAX(temperature) as max_temp,
    MIN(temperature) as min_temp,
    AVG(humidity) as avg_humidity,
    AVG(co2) as avg_co2,
    COUNT(*) as data_count
FROM sensor_data 
WHERE created_at >= '2024-01-01 00:00:00' 
  AND created_at <= '2024-01-31 23:59:59'
GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H')
ORDER BY hour_period;

-- ========================================
-- 9. 导出用查询
-- ========================================

-- 完整数据导出查询
SELECT
    device_id as '设备ID',
    ROUND(temperature, 2) as '温度(°C)',
    ROUND(humidity, 2) as '湿度(%)',
    breathing_rate as '呼吸频率(次/分)',
    spo2 as '血氧饱和度(%)',
    light_intensity as '光照强度(lux)',
    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as '记录时间'
FROM sensor_data
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY created_at DESC;

-- 告警记录导出查询
SELECT 
    device_id as '设备ID',
    alert_type as '告警类型',
    alert_level as '告警级别',
    alert_message as '告警消息',
    sensor_value as '传感器数值',
    threshold_value as '阈值',
    CASE WHEN is_resolved THEN '已解决' ELSE '未解决' END as '状态',
    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as '告警时间'
FROM alert_records 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY created_at DESC;

-- 查询完成提示
SELECT '📊 Navicat图表配置SQL准备完成！可以复制这些查询创建可视化图表。' as message;
