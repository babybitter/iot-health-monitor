// 物联网监测系统后端服务 - HTTPS生产环境版本
const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const mqtt = require("mqtt");
const Database = require("./config/database");
const moment = require("moment");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// MQTT客户端配置
const mqttConfig = {
  host: process.env.MQTT_HOST || "mqtt.healthtrack.top",
  port: process.env.MQTT_PORT || 8883,
  username: process.env.MQTT_USERNAME || "test",
  password: process.env.MQTT_PASSWORD || "test123",
};

let mqttClient = null;

// 数据缓存对象，用于合并同一时间窗口的数据
const dataBuffer = {
  data: {},
  timeout: null,
  BUFFER_TIME: 2000 // 2秒缓存时间
};

// 初始化MQTT连接 - 使用SSL
function initMQTT() {
  if (!mqttConfig.host || mqttConfig.host === "") {
    console.log("⚠️ 未配置MQTT主机，跳过MQTT连接");
    return;
  }

  const brokerUrl = `mqtts://${mqttConfig.host}:${mqttConfig.port}`;
  console.log("🔗 连接MQTT服务器:", brokerUrl);

  mqttClient = mqtt.connect(brokerUrl, {
    clientId: `iot_backend_${Date.now()}`,
    username: mqttConfig.username,
    password: mqttConfig.password,
    keepalive: 60,
    reconnectPeriod: 5000,
    rejectUnauthorized: false, // 生产环境中应该设置为true
  });

  mqttClient.on("connect", () => {
    console.log("✅ MQTT SSL连接成功");

    // 订阅所有监测主题
    const topics = [
      "patient/monitor/temperature",
      "patient/monitor/humidity", 
      "patient/monitor/breathing",
      "patient/monitor/spo2",
      "patient/monitor/light",
      "patient/monitor/pressure",
      "patient/monitor/heart_rate",
      "patient/upload/data",
      "patient/advice/device",
      "patient/upload/data/temperature",
      "home/devices/onoff/+/+",
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
        data = parseFloat(message.toString()) || message.toString();
      }

      console.log(`📨 收到MQTT消息 [${topic}]:`, data);

      // 处理新增主题
      if (topic === "patient/upload/data") {
        console.log("📤 收到设备上报数据:", data);
        await handleDeviceDataUpload(data);
        return;
      }

      if (topic === "patient/advice/device") {
        console.log("💡 收到设备建议:", data);
        await handleDeviceAdvice(data);
        return;
      }

      if (topic === "patient/upload/data/temperature") {
        console.log("🌡️ 收到体温专用数据:", data);
        await handleVitalTemperature(data);
        return;
      }

      // 解析主题类型
      const topicType = topic.split("/").pop();
      const deviceId = (typeof data === 'object' && data !== null) ?
        (data.device_id || "default_device") : "default_device";

      // 处理不同数据格式，提取数值
      let value;
      if (typeof data === 'object' && data !== null) {
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

          await Database.updateDeviceStatus(deviceId, "online");
          await checkAlerts(completeData);
          return;
        }
        value = data.value || data[topicType] || data;
      } else {
        value = data;
      }

      // 特殊处理气压数据格式
      if (topicType === 'pressure' && typeof value === 'string' && value.includes('data:')) {
        const match = value.match(/data:\s*(\d+)/);
        if (match) {
          value = parseFloat(match[1]);
          console.log(`🔧 气压数据格式转换: "${message.toString()}" -> ${value}`);
        }
      }

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

  for (const alert of alerts) {
    await Database.insertAlert(alert);
    console.log(`🚨 告警触发: ${alert.alert_message}`);
  }
}

// API路由 - 复用原有的路由
app.get("/api/latest/:deviceId?", async (req, res) => {
  try {
    const deviceId = req.params.deviceId || "default_device";
    const data = await Database.getLatestSensorData(deviceId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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

app.post("/api/sensor-data", async (req, res) => {
  try {
    const sensorData = req.body;

    if (!sensorData.device_id) {
      return res.status(400).json({
        success: false,
        error: "缺少设备ID (device_id)",
      });
    }

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
      ssl: "enabled",
      timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
    },
  });
});

// 缓存传感器数据
async function bufferSensorData(deviceId, sensorType, value) {
  try {
    if (!dataBuffer.data[deviceId]) {
      dataBuffer.data[deviceId] = {};
    }

    dataBuffer.data[deviceId][sensorType] = value;
    dataBuffer.data[deviceId].device_id = deviceId;
    dataBuffer.data[deviceId].lastUpdate = Date.now();

    console.log(`📝 缓存数据 [${deviceId}] ${sensorType}: ${value}`);

    if (dataBuffer.timeout) {
      clearTimeout(dataBuffer.timeout);
    }

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

      const hasData = Object.values(sensorData).some(val => val !== null && val !== deviceId);

      if (hasData) {
        console.log("💾 批量存储合并数据:", sensorData);
        await Database.insertSensorData(sensorData);
        console.log("✅ 合并数据存储成功");

        await Database.updateDeviceStatus(deviceId, "online");
        await checkAlerts(sensorData);
      }
    }

    dataBuffer.data = {};
    dataBuffer.timeout = null;

  } catch (error) {
    console.error("❌ 批量存储数据失败:", error);
  }
}

// 新增主题处理函数
async function handleDeviceDataUpload(data) {
  try {
    console.log("处理设备上报数据:", data);
    console.log("📝 设备上报数据已记录（暂不存储到数据库）");
  } catch (error) {
    console.error("❌ 处理设备上报数据失败:", error);
  }
}

async function handleDeviceAdvice(data) {
  try {
    console.log("处理设备建议:", data);

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
    console.log("处理体温专用数据:", data);

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

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    const dbConnected = await Database.testConnection();
    if (!dbConnected) {
      console.error("❌ 数据库连接失败");
      process.exit(1);
    }
    console.log("✅ 数据库连接成功");

    // 初始化MQTT
    initMQTT();

    // 启动HTTP服务器（用于重定向到HTTPS）
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 HTTP服务器已启动在端口 ${PORT}`);
    });

    // 尝试启动HTTPS服务器
    try {
      const httpsOptions = {
        key: fs.readFileSync(path.join(__dirname, '../emqx/certs/mqtt.healthtrack.top.key')),
        cert: fs.readFileSync(path.join(__dirname, '../emqx/certs/mqtt.healthtrack.top.pem'))
      };

      https.createServer(httpsOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`🔒 HTTPS服务器已启动在端口 ${HTTPS_PORT}`);
        console.log(`🌐 生产环境访问: https://api.healthtrack.top`);
        console.log(`🔒 MQTT WSS连接: wss://mqtt.healthtrack.top:8084/mqtt`);
      });
    } catch (sslError) {
      console.warn("⚠️ HTTPS启动失败，仅使用HTTP:", sslError.message);
      console.log(`📡 HTTP API地址: http://api.healthtrack.top:${PORT}`);
    }

  } catch (error) {
    console.error("❌ 服务器启动失败:", error);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  console.log("🛑 正在关闭服务器...");
  if (mqttClient) {
    mqttClient.end();
  }
  await Database.close();
  process.exit(0);
});

// 启动应用
startServer();
