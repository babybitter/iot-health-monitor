-- 添加体温字段到现有数据库
-- 执行此脚本为现有的sensor_data表添加body_temperature字段

USE iot_monitor;

-- 检查字段是否已存在，如果不存在则添加
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'iot_monitor' 
     AND TABLE_NAME = 'sensor_data' 
     AND COLUMN_NAME = 'body_temperature') = 0,
    'ALTER TABLE sensor_data ADD COLUMN body_temperature DECIMAL(5,2) NULL COMMENT "体温(°C)" AFTER blood_oxygen;',
    'SELECT "字段body_temperature已存在" as message;'
));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 显示表结构确认
DESCRIBE sensor_data;

-- 显示成功消息
SELECT '✅ 体温字段添加完成！现在可以存储人体体温数据了。' as result;
