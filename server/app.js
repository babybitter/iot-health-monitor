// 物联网监测系统后端服务
const express = require("express");
const cors = require("cors");
const mqtt = require("mqtt");
const Database = require("./config/database");
const moment = require("moment");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// MQTT客户端配置
const mqttConfig = {
  host: process.env.MQTT_HOST || "",
  port: process.env.MQTT_PORT || 1883,
  username: process.env.MQTT_USERNAME || "",
  password: process.env.MQTT_PASSWORD || "",
};

let mqttClient = null;

// 数据缓存对象，用于合并同一时间窗口的数据
const dataBuffer = {
  data: {},
  timeout: null,
  BUFFER_TIME: 2000 // 2秒缓存时间
};

// 初始化MQTT连接
function initMQTT() {
  // 如果没有配置MQTT主机，跳过MQTT连接
  if (!mqttConfig.host || mqttConfig.host === "") {
    return;
  }

  const brokerUrl = `mqtt://${mqttConfig.host}:${mqttConfig.port}`;
  console.log("🔗 连接MQTT服务器:", brokerUrl);

  mqttClient = mqtt.connect(brokerUrl, {
    clientId: `iot_backend_${Date.now()}`,
    username: mqttConfig.username,
    password: mqttConfig.password,
    keepalive: 60,
    reconnectPeriod: 5000,
  });

  mqttClient.on("connect", () => {
    console.log("✅ MQTT连接成功");

    // 订阅所有监测主题
    const topics = [
      "patient/monitor/temperature",
      "patient/monitor/humidity",
      "patient/monitor/breathing",
      "patient/monitor/spo2",
      "patient/monitor/light", // 光照数据主题
      "patient/monitor/pressure", // 气压数据主题
      "patient/monitor/heart_rate", // 心跳频率主题
      // 新增主题
      "patient/upload/data", // 数据上传主题（用于设备主动上报业务数据）
      "patient/advice/device", // 建议主题（用于向设备下发建议）
      "patient/upload/data/temperature", // 体温数据专用上报通道
      // 硬件端兼容主题
      "home/devices/onoff/+/+", // 订阅硬件端所有设备的所有传感器数据
    ];

    topics.forEach((topic) => {
      mqttClient.subscribe(topic, (err) => {
        if (err) {
          console.error(`❌ 订阅主题失败 ${topic}:`, err);
        } else {
          console.log(`📡 订阅主题成功: ${topic}`);
        }
      });
    });
  });

  mqttClient.on("message", async (topic, message) => {
    try {
      let data;
      try {
        data = JSON.parse(message.toString());
      } catch (parseError) {
        // 如果不是JSON格式，尝试作为数字处理
        data = parseFloat(message.toString()) || message.toString();
      }

      console.log(`📨 收到MQTT消息 [${topic}]:`, data);

      // 处理新增主题
      if (topic === "patient/upload/data") {
        // 数据上传主题 - 设备主动上报业务数据
        console.log("📤 收到设备上报数据:", data);
        await handleDeviceDataUpload(data);
        return;
      }

      if (topic === "patient/advice/device") {
        // 建议主题 - 向设备下发建议
        console.log("💡 收到设备建议:", data);
        await handleDeviceAdvice(data);
        return;
      }

      if (topic === "patient/upload/data/temperature") {
        // 体温数据专用上报通道
        console.log("🌡️ 收到体温专用数据:", data);
        await handleVitalTemperature(data);
        return;
      }

      // 解析主题类型
      const topicType = topic.split("/").pop();

      // 获取设备ID
      const deviceId = (typeof data === 'object' && data !== null) ?
        (data.device_id || "default_device") : "default_device";

      // 处理不同数据格式，提取数值
      let value;
      if (typeof data === 'object' && data !== null) {
        // 如果是完整数据包，直接存储
        if (data.temperature !== undefined || data.humidity !== undefined) {
          const completeData = {
            device_id: deviceId,
            temperature: data.temperature,
            humidity: data.humidity,
            breathing_rate: data.breathing || data.breathing_rate,
            spo2: data.spo2,
            light_intensity: data.light || data.light_intensity,
            pressure: data.pressure,
            heart_rate: data.heart_rate,
            body_temperature: data.body_temperature || data.vitalTemperature,
          };

          console.log("💾 存储完整数据包:", completeData);
          await Database.insertSensorData(completeData);
          console.log("✅ 完整数据存储成功");

          // 更新设备状态和检查告警
          await Database.updateDeviceStatus(deviceId, "online");
          await checkAlerts(completeData);
          return;
        }
        value = data.value || data[topicType] || data;
      } else {
        value = data;
      }

      // 特殊处理气压数据格式 "data: 855" -> 855
      if (topicType === 'pressure' && typeof value === 'string' && value.includes('data:')) {
        const match = value.match(/data:\s*(\d+)/);
        if (match) {
          value = parseFloat(match[1]);
          console.log(`🔧 气压数据格式转换: "${message.toString()}" -> ${value}`);
        }
      }

      // 使用缓存机制合并单个传感器数据
      await bufferSensorData(deviceId, topicType, value);
    } catch (error) {
      console.error("❌ 处理MQTT消息失败:", error);
    }
  });

  mqttClient.on("error", (error) => {
    console.error("❌ MQTT连接错误:", error);
  });

  mqttClient.on("close", () => {
    console.log("🔌 MQTT连接关闭");
  });
}

// 告警检查函数
async function checkAlerts(data) {
  const alerts = [];

  // 温度告警
  if (data.temperature !== undefined) {
    if (data.temperature > 38) {
      alerts.push({
        device_id: data.device_id,
        alert_type: "temperature",
        alert_level: "critical",
        alert_message: `体温过高: ${data.temperature}°C`,
        sensor_value: data.temperature,
        threshold_value: 38,
      });
    } else if (data.temperature < 35) {
      alerts.push({
        device_id: data.device_id,
        alert_type: "temperature",
        alert_level: "warning",
        alert_message: `体温过低: ${data.temperature}°C`,
        sensor_value: data.temperature,
        threshold_value: 35,
      });
    }
  }

  // CO2告警
  if (data.co2 !== undefined && data.co2 > 1000) {
    alerts.push({
      device_id: data.device_id,
      alert_type: "co2",
      alert_level: "warning",
      alert_message: `CO2浓度过高: ${data.co2}ppm`,
      sensor_value: data.co2,
      threshold_value: 1000,
    });
  }

  // 血氧告警
  if (data.spo2 !== undefined && data.spo2 < 95) {
    alerts.push({
      device_id: data.device_id,
      alert_type: "spo2",
      alert_level: "critical",
      alert_message: `血氧饱和度过低: ${data.spo2}%`,
      sensor_value: data.spo2,
      threshold_value: 95,
    });
  }

  // 心跳频率告警
  if (data.heart_rate !== undefined) {
    if (data.heart_rate > 100) {
      alerts.push({
        device_id: data.device_id,
        alert_type: "heart_rate",
        alert_level: "warning",
        alert_message: `心跳过快: ${data.heart_rate}bpm`,
        sensor_value: data.heart_rate,
        threshold_value: 100,
      });
    } else if (data.heart_rate < 60) {
      alerts.push({
        device_id: data.device_id,
        alert_type: "heart_rate",
        alert_level: "warning",
        alert_message: `心跳过慢: ${data.heart_rate}bpm`,
        sensor_value: data.heart_rate,
        threshold_value: 60,
      });
    }
  }

  // 气压告警（异常气压变化）
  if (data.pressure !== undefined) {
    if (data.pressure < 950 || data.pressure > 1050) {
      alerts.push({
        device_id: data.device_id,
        alert_type: "pressure",
        alert_level: "info",
        alert_message: `气压异常: ${data.pressure}hPa`,
        sensor_value: data.pressure,
        threshold_value: data.pressure < 950 ? 950 : 1050,
      });
    }
  }

  // 保存告警记录
  for (const alert of alerts) {
    await Database.insertAlert(alert);
    console.log(`🚨 告警触发: ${alert.alert_message}`);
  }
}

// 获取最新数据
app.get("/api/latest/:deviceId?", async (req, res) => {
  try {
    const deviceId = req.params.deviceId || "default_device";
    const data = await Database.getLatestSensorData(deviceId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取历史数据
app.get("/api/history/:deviceId?", async (req, res) => {
  try {
    const deviceId = req.params.deviceId || "default_device";
    const { page = 1, limit = 50, start_time, end_time } = req.query;

    const data = await Database.getHistoryData(
      deviceId,
      parseInt(page),
      parseInt(limit),
      start_time,
      end_time
    );

    res.json({
      success: true,
      data,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取统计数据
app.get("/api/statistics/:deviceId?", async (req, res) => {
  try {
    const deviceId = req.params.deviceId || "default_device";
    const { days = 7 } = req.query;

    const data = await Database.getStatistics(deviceId, parseInt(days));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取告警记录
app.get("/api/alerts/:deviceId?", async (req, res) => {
  try {
    const deviceId = req.params.deviceId || "default_device";
    const { limit = 20 } = req.query;

    const data = await Database.getAlerts(deviceId, parseInt(limit));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 硬件端传感器数据接收接口
app.post("/api/sensor-data", async (req, res) => {
  try {
    const sensorData = req.body;

    // 验证必要字段
    if (!sensorData.device_id) {
      return res.status(400).json({
        success: false,
        error: "缺少设备ID (device_id)",
      });
    }

    // 插入数据库
    await Database.insertSensorData(sensorData);

    res.json({
      success: true,
      message: "硬件端数据接收成功",
      device_id: sensorData.device_id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 缓存传感器数据，合并同一时间窗口的数据
async function bufferSensorData(deviceId, sensorType, value) {
  try {
    // 初始化设备数据缓存
    if (!dataBuffer.data[deviceId]) {
      dataBuffer.data[deviceId] = {};
    }

    // 更新传感器数据
    dataBuffer.data[deviceId][sensorType] = value;
    dataBuffer.data[deviceId].device_id = deviceId;
    dataBuffer.data[deviceId].lastUpdate = Date.now();

    console.log(`📝 缓存数据 [${deviceId}] ${sensorType}: ${value}`);

    // 清除之前的定时器
    if (dataBuffer.timeout) {
      clearTimeout(dataBuffer.timeout);
    }

    // 设置新的定时器，延迟存储以合并数据
    dataBuffer.timeout = setTimeout(async () => {
      await flushBufferedData();
    }, dataBuffer.BUFFER_TIME);

  } catch (error) {
    console.error("❌ 缓存数据失败:", error);
  }
}

// 将缓存的数据批量存储到数据库
async function flushBufferedData() {
  try {
    const devices = Object.keys(dataBuffer.data);

    for (const deviceId of devices) {
      const deviceData = dataBuffer.data[deviceId];

      // 构建完整的传感器数据对象
      const sensorData = {
        device_id: deviceId,
        temperature: deviceData.temperature || null,
        humidity: deviceData.humidity || null,
        breathing_rate: deviceData.breathing || null,
        spo2: deviceData.spo2 || null,
        light_intensity: deviceData.light || deviceData.light_intensity || null,
        pressure: deviceData.pressure || null,
        heart_rate: deviceData.heart_rate || null,
      };

      // 只有当至少有一个传感器数据时才存储
      const hasData = Object.values(sensorData).some(val => val !== null && val !== deviceId);

      if (hasData) {
        console.log("💾 批量存储合并数据:", sensorData);
        await Database.insertSensorData(sensorData);
        console.log("✅ 合并数据存储成功");

        // 更新设备状态
        await Database.updateDeviceStatus(deviceId, "online");

        // 检查告警条件
        await checkAlerts(sensorData);
      }
    }

    // 清空缓存
    dataBuffer.data = {};
    dataBuffer.timeout = null;

  } catch (error) {
    console.error("❌ 批量存储数据失败:", error);
  }
}

// 新增主题处理函数
async function handleDeviceDataUpload(data) {
  try {
    // 处理设备主动上报的业务数据
    console.log("处理设备上报数据:", data);

    // 暂时跳过数据库存储，因为表结构不匹配
    // TODO: 如果需要存储这类数据，需要创建专门的表或修改现有表结构
    console.log("📝 设备上报数据已记录（暂不存储到数据库）");
  } catch (error) {
    console.error("❌ 处理设备上报数据失败:", error);
  }
}

async function handleDeviceAdvice(data) {
  try {
    // 处理向设备下发的建议
    console.log("处理设备建议:", data);

    // 记录建议日志
    const query = `
      INSERT INTO device_advice_log (device_id, advice_type, advice_content, created_at)
      VALUES (?, ?, ?, NOW())
    `;

    await Database.query(query, [
      data.device_id || 'unknown_device',
      data.advice_type || 'general',
      JSON.stringify(data.advice || data)
    ]);

    console.log("✅ 设备建议已记录");
  } catch (error) {
    console.error("❌ 处理设备建议失败:", error);
  }
}

async function handleVitalTemperature(data) {
  try {
    // 处理体温专用数据
    console.log("处理体温专用数据:", data);

    // 保存体温数据到sensor_data表的body_temperature字段
    const completeData = {
      device_id: data.device_id || 'default_device',
      body_temperature: data.temperature || data.value,
    };

    await Database.insertSensorData(completeData);
    console.log("✅ 体温专用数据已保存到sensor_data表");
  } catch (error) {
    console.error("❌ 处理体温专用数据失败:", error);
  }
}

// 新增主题数据查询接口
app.get("/api/device-upload/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    const offset = (page - 1) * limit;
    const query = `
      SELECT * FROM sensor_data
      WHERE device_id = ? AND data_type = 'device_upload'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const results = await Database.query(query, [deviceId, parseInt(limit), offset]);

    res.json({
      success: true,
      data: results,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error("查询设备上报数据失败:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/device-advice/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    const offset = (page - 1) * limit;
    const query = `
      SELECT * FROM device_advice_log
      WHERE device_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const results = await Database.query(query, [deviceId, parseInt(limit), offset]);

    res.json({
      success: true,
      data: results,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error("查询设备建议失败:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 体温数据现在直接包含在历史数据API中，不需要单独的接口

// 健康检查
app.get("/api/health", async (_, res) => {
  const dbStatus = await Database.testConnection();
  const mqttStatus = mqttClient && mqttClient.connected;

  res.json({
    success: true,
    status: {
      database: dbStatus ? "connected" : "disconnected",
      mqtt: mqttStatus ? "connected" : "disconnected",
      server: "running",
      timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
    },
  });
});

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    await Database.testConnection();

    // 初始化MQTT
    initMQTT();

    // 启动HTTP服务器 - 监听所有网络接口
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 服务器已启动在端口 ${PORT}`);
      console.log(`📡 API地址: http://0.0.0.0:${PORT}`);
      console.log(`🌐 外网访问: http://47.122.130.135:${PORT}`);
    });
  } catch (error) {
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  if (mqttClient) {
    mqttClient.end();
  }
  await Database.close();
  process.exit(0);
});

// 启动应用
startServer();
