// MySQL数据库配置 - 单连接模式
const mysql = require("mysql2/promise");
require("dotenv").config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "admin",
  database: process.env.DB_NAME || "iot_monitor",
};

// 数据库操作类
class Database {
  // 创建单个连接
  static async createConnection() {
    try {
      const connection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
      });
      return connection;
    } catch (error) {
      console.error("数据库连接创建失败:", error);
      throw error;
    }
  }

  // 执行查询（使用单连接）
  static async query(sql, params = []) {
    let connection;
    try {
      connection = await this.createConnection();
      const [rows] = await connection.execute(sql, params);
      return rows;
    } catch (error) {
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // 插入传感器数据
  static async insertSensorData(data) {
    const sql = `
      INSERT INTO sensor_data (
        device_id, temperature, humidity, breathing_rate, spo2,
        light_intensity, pressure, heart_rate, body_temperature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.device_id || "default_device",
      data.temp || data.temperature || null,
      data.humi || data.humidity || null,
      data.breathing || data.breathing_rate || null,
      data.spo2 || null,
      data.light || data.light_intensity || null,
      data.pressure || null,
      data.heart_rate || null,
      data.body_temperature || data.vitalTemperature || null,
    ];
    return await this.query(sql, params);
  }

  // 获取传感器数据
  static async getLatestSensorData(deviceId = "default_device") {
    const sql = `
      SELECT
        id, device_id,
        CAST(temperature AS DECIMAL(5,2)) as temp,
        CAST(humidity AS DECIMAL(5,2)) as humi,
        CAST(breathing_rate AS DECIMAL(5,2)) as breathing,
        CAST(spo2 AS DECIMAL(5,2)) as spo2,
        CAST(light_intensity AS DECIMAL(8,2)) as light,
        CAST(pressure AS DECIMAL(8,2)) as pressure,
        CAST(heart_rate AS DECIMAL(5,2)) as heart_rate,
        CAST(body_temperature AS DECIMAL(5,2)) as body_temperature,
        created_at, updated_at
      FROM sensor_data
      WHERE device_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const result = await this.query(sql, [deviceId]);
    return result[0] || null;
  }

  // 获取历史数据(分页)
  static async getHistoryData(
    deviceId = "default_device",
    page = 1,
    limit = 50,
    startTime = null,
    endTime = null
  ) {
    let sql = `
      SELECT
        id, device_id,
        CAST(temperature AS DECIMAL(5,2)) as temp,
        CAST(humidity AS DECIMAL(5,2)) as humi,
        CAST(breathing_rate AS DECIMAL(5,2)) as breathing,
        CAST(spo2 AS DECIMAL(5,2)) as spo2,
        CAST(light_intensity AS DECIMAL(8,2)) as light,
        CAST(pressure AS DECIMAL(8,2)) as pressure,
        CAST(heart_rate AS DECIMAL(5,2)) as heart_rate,
        CAST(body_temperature AS DECIMAL(5,2)) as body_temperature,
        created_at, updated_at
      FROM sensor_data
      WHERE device_id = ?
    `;
    const params = [deviceId];

    if (startTime) {
      sql += " AND created_at >= ?";
      params.push(startTime);
    }
    if (endTime) {
      sql += " AND created_at <= ?";
      params.push(endTime);
    }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, (page - 1) * limit);

    return await this.query(sql, params);
  }

  // 获取统计数据
  static async getStatistics(deviceId = "default_device", days = 7) {
    const sql = `
      SELECT
        DATE(created_at) as date,
        AVG(temperature) as avg_temp,
        MAX(temperature) as max_temp,
        MIN(temperature) as min_temp,
        AVG(humidity) as avg_humidity,
        AVG(breathing_rate) as avg_breathing,
        AVG(spo2) as avg_spo2,
        AVG(light_intensity) as avg_light,
        AVG(pressure) as avg_pressure,
        AVG(heart_rate) as avg_heart_rate,
        COUNT(*) as data_count
      FROM sensor_data
      WHERE device_id = ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    return await this.query(sql, [deviceId, days]);
  }

  // 更新设备状态
  static async updateDeviceStatus(deviceId, status = "online") {
    const sql = `
      UPDATE device_status 
      SET status = ?, last_heartbeat = NOW(), updated_at = NOW()
      WHERE device_id = ?
    `;
    return await this.query(sql, [status, deviceId]);
  }

  // 插入告警记录
  static async insertAlert(alertData) {
    const sql = `
      INSERT INTO alert_records (
        device_id, alert_type, alert_level, 
        alert_message, sensor_value, threshold_value
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      alertData.device_id,
      alertData.alert_type,
      alertData.alert_level,
      alertData.alert_message,
      alertData.sensor_value || null,
      alertData.threshold_value || null,
    ];
    return await this.query(sql, params);
  }

  // 获取告警记录
  static async getAlerts(deviceId = "default_device", limit = 20) {
    const sql = `
      SELECT * FROM alert_records
      WHERE device_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    return await this.query(sql, [deviceId, limit]);
  }

  // 测试数据库连接
  static async testConnection() {
    try {
      // 使用单连接测试，而不是连接池
      const connection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
      });

      await connection.execute("SELECT 1 as test");
      await connection.end();
      return true;
    } catch (error) {
      return false;
    }
  }

  // 关闭连接
  static async close() {}
}

module.exports = Database;
