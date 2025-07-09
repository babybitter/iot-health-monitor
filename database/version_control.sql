-- 数据库版本控制脚本
-- 用于跟踪数据库结构版本和迁移历史

USE iot_monitor;

-- 创建数据库版本表
CREATE TABLE IF NOT EXISTS db_version (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    version VARCHAR(20) NOT NULL COMMENT '版本号',
    description TEXT NULL COMMENT '版本描述',
    migration_script VARCHAR(255) NULL COMMENT '迁移脚本文件名',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '应用时间',
    applied_by VARCHAR(100) DEFAULT 'system' COMMENT '应用者',
    INDEX idx_version (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据库版本控制表';

-- 插入版本记录
INSERT INTO db_version (version, description, migration_script) VALUES 
('1.0.0', '初始数据库结构，包含基础传感器数据表', 'init.sql'),
('2.0.0', '更新数据结构：添加心跳、气压字段，重命名血氧字段，删除CO2字段', 'migrate_to_v2.sql')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- 查看当前版本
SELECT * FROM db_version ORDER BY applied_at DESC LIMIT 5;

-- 创建版本检查函数
DELIMITER //
CREATE FUNCTION IF NOT EXISTS GetCurrentDBVersion() 
RETURNS VARCHAR(20)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE current_version VARCHAR(20) DEFAULT '1.0.0';
    
    SELECT version INTO current_version 
    FROM db_version 
    ORDER BY applied_at DESC 
    LIMIT 1;
    
    RETURN current_version;
END //
DELIMITER ;

-- 显示当前数据库版本
SELECT GetCurrentDBVersion() as current_version;
