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
      const data = JSON.parse(message.toString());
      console.log(`📨 收到MQTT消息 [${topic}]:`, data);

      // 解析主题类型
      const topicType = topic.split("/").pop();

      // 构建传感器数据对象
      const sensorData = {
        device_id: data.device_id || "default_device",
        [topicType]: data.value || data[topicType],
      };

      // 如果是完整数据包，直接使用
      if (data.temperature !== undefined || data.humidity !== undefined) {
        Object.assign(sensorData, {
          temperature: data.temperature,
          humidity: data.humidity,
          co2: data.co2,
          breathing_rate: data.breathing || data.breathing_rate,
          spo2: data.spo2,
          light_intensity: data.light || data.light_intensity,
        });
      }

      // 存储到数据库
      await Database.insertSensorData(sensorData);

      // 更新设备状态
      await Database.updateDeviceStatus(sensorData.device_id, "online");

      // 检查告警条件
      await checkAlerts(sensorData);
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

    // 启动HTTP服务器
    app.listen(PORT, () => {});
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
