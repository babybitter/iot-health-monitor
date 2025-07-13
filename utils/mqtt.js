// MQTT工具类
const config = require("../config/config.js");

class MQTTClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.callbacks = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 2000;
  }

  // 连接MQTT服务器
  connect() {
    return new Promise((resolve, reject) => {
      try {
        // 如果已经连接，直接返回
        if (this.isConnected && this.client) {
          resolve();
          return;
        }

        console.log("开始连接MQTT服务器:", config.mqtt.host);

        // 创建WebSocket连接到EMQX的WebSocket端口
        wx.connectSocket({
          url: config.mqtt.host,
          protocols: ["mqtt"],
          success: (res) => {
            console.log("WebSocket连接请求发送成功:", res);
          },
          fail: (error) => {
            console.error("WebSocket连接请求失败:", error);
            this.showAlert("MQTT连接请求失败", "error");
            reject(error);
          },
        });

        // 监听WebSocket连接打开事件
        wx.onSocketOpen((res) => {
          console.log("WebSocket连接已建立:", res);

          // 发送MQTT连接包
          this.sendConnectPacket();

          // 等待MQTT连接确认
          setTimeout(() => {
            this.isConnected = true;
            this.reconnectAttempts = 0;

            // 通知app更新全局状态
            const app = getApp();
            if (app && app.updateMQTTStatus) {
              app.updateMQTTStatus(true);
            }

            this.showAlert("MQTT连接成功", "success");
            console.log("MQTT连接成功");

            // 订阅主题
            this.subscribeTopics();

            resolve();
          }, 2000); // 增加等待时间
        });

        // 监听WebSocket错误事件
        wx.onSocketError((error) => {
          console.error("MQTT连接错误:", error);
          this.isConnected = false;
          this.showAlert("MQTT连接失败，请检查网络", "error");
          reject(error);
        });

        // 监听WebSocket消息事件
        wx.onSocketMessage((res) => {
          console.log("收到MQTT消息:", res);
          console.log("消息数据类型:", typeof res.data);
          console.log(
            "消息数据长度:",
            res.data ? res.data.byteLength : "undefined"
          );
          this.handleMessage(res);
        });

        // 监听WebSocket关闭事件
        wx.onSocketClose((res) => {
          console.log("MQTT连接关闭:", res);
          this.isConnected = false;

          // 通知app更新全局状态
          const app = getApp();
          if (app && app.updateMQTTStatus) {
            app.updateMQTTStatus(false);
          }

          // 如果不是主动断开，尝试重连
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.showAlert(
              `正在重连... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
              "info"
            );
            setTimeout(() => {
              this.connect().catch(() => {
                this.showAlert("MQTT重连失败", "warning");
              });
            }, this.reconnectDelay);
          } else {
            this.showAlert("MQTT连接中断，请检查网络", "error");
            this.reconnectAttempts = 0;
          }
        });
      } catch (error) {
        console.error("MQTT初始化失败:", error);
        this.showAlert("MQTT初始化失败", "error");
        reject(error);
      }
    });
  }

  // 发送MQTT连接包
  sendConnectPacket() {
    try {
      console.log("发送MQTT连接包...");

      // 构建MQTT CONNECT包的二进制数据
      const clientId = config.mqtt.clientId;
      const username = config.mqtt.username;
      const password = config.mqtt.password;

      // MQTT CONNECT包结构（简化版）
      const protocolName = "MQTT";
      const protocolLevel = 4; // MQTT 3.1.1

      // 计算总长度
      let variableHeaderLength = 2 + protocolName.length + 1 + 1 + 2; // 协议名长度 + 协议名 + 协议级别 + 连接标志 + 保活时间
      let payloadLength = 2 + clientId.length; // 客户端ID长度 + 客户端ID

      if (username) {
        payloadLength += 2 + username.length; // 用户名长度 + 用户名
      }
      if (password) {
        payloadLength += 2 + password.length; // 密码长度 + 密码
      }

      const totalLength = variableHeaderLength + payloadLength;

      // 创建ArrayBuffer
      const buffer = new ArrayBuffer(totalLength + 2); // +2 for fixed header
      const view = new DataView(buffer);
      let offset = 0;

      // Fixed Header
      view.setUint8(offset++, 0x10); // CONNECT消息类型
      view.setUint8(offset++, totalLength); // 剩余长度

      // Variable Header
      // 协议名长度和协议名
      view.setUint16(offset, protocolName.length);
      offset += 2;
      for (let i = 0; i < protocolName.length; i++) {
        view.setUint8(offset++, protocolName.charCodeAt(i));
      }

      // 协议级别
      view.setUint8(offset++, protocolLevel);

      // 连接标志
      let connectFlags = 0x02; // Clean Session
      if (username) connectFlags |= 0x80; // Username flag
      if (password) connectFlags |= 0x40; // Password flag
      view.setUint8(offset++, connectFlags);

      // 保活时间
      view.setUint16(offset, config.mqtt.keepalive);
      offset += 2;

      // Payload
      // 客户端ID
      view.setUint16(offset, clientId.length);
      offset += 2;
      for (let i = 0; i < clientId.length; i++) {
        view.setUint8(offset++, clientId.charCodeAt(i));
      }

      // 用户名
      if (username) {
        view.setUint16(offset, username.length);
        offset += 2;
        for (let i = 0; i < username.length; i++) {
          view.setUint8(offset++, username.charCodeAt(i));
        }
      }

      // 密码
      if (password) {
        view.setUint16(offset, password.length);
        offset += 2;
        for (let i = 0; i < password.length; i++) {
          view.setUint8(offset++, password.charCodeAt(i));
        }
      }

      console.log("发送MQTT CONNECT包，长度:", buffer.byteLength);

      // 发送二进制数据
      wx.sendSocketMessage({
        data: buffer,
        success: (res) => {
          console.log("MQTT连接包发送成功:", res);
        },
        fail: (error) => {
          console.error("MQTT连接包发送失败:", error);
          this.showAlert("MQTT连接包发送失败", "error");
        },
      });
    } catch (error) {
      console.error("发送MQTT连接包失败:", error);
      this.showAlert("MQTT连接包发送失败", "error");
    }
  }

  // 订阅主题
  subscribeTopics() {
    try {
      const topics = config.mqtt.topics;
      console.log("开始订阅主题:", topics);

      Object.values(topics).forEach((topic, index) => {
        setTimeout(() => {
          this.subscribe(topic);
        }, index * 200); // 延迟订阅，避免并发问题
      });
    } catch (error) {
      console.error("订阅主题失败:", error);
      this.showAlert("订阅主题失败", "error");
    }
  }

  // 订阅单个主题
  subscribe(topic) {
    if (!this.isConnected) {
      return;
    }

    try {
      console.log("订阅主题:", topic);

      // 构建MQTT SUBSCRIBE包
      const messageId = Date.now() % 65535;

      // 计算长度
      const topicLength = topic.length;
      const variableHeaderLength = 2; // Message ID
      const payloadLength = 2 + topicLength + 1; // Topic length + Topic + QoS
      const totalLength = variableHeaderLength + payloadLength;

      // 创建ArrayBuffer
      const buffer = new ArrayBuffer(totalLength + 2); // +2 for fixed header
      const view = new DataView(buffer);
      let offset = 0;

      // Fixed Header
      view.setUint8(offset++, 0x82); // SUBSCRIBE消息类型
      view.setUint8(offset++, totalLength); // 剩余长度

      // Variable Header - Message ID
      view.setUint16(offset, messageId);
      offset += 2;

      // Payload
      // Topic length
      view.setUint16(offset, topicLength);
      offset += 2;

      // Topic
      for (let i = 0; i < topicLength; i++) {
        view.setUint8(offset++, topic.charCodeAt(i));
      }

      // QoS
      view.setUint8(offset++, 0); // QoS 0

      console.log(
        `发送MQTT SUBSCRIBE包，主题: ${topic}, 长度:`,
        buffer.byteLength
      );

      // 发送二进制数据
      wx.sendSocketMessage({
        data: buffer,
        success: (res) => {
          console.log(`主题 ${topic} 订阅请求发送成功:`, res);
        },
        fail: (error) => {
          console.error(`订阅主题失败: ${topic}`, error);
          this.showAlert(`订阅主题失败: ${topic}`, "warning");
        },
      });
    } catch (error) {
      console.error(`订阅主题失败: ${topic}`, error);
      this.showAlert(`订阅主题失败: ${topic}`, "warning");
    }
  }

  // 处理接收到的消息
  handleMessage(res) {
    try {
      console.log("处理MQTT消息:", res);

      // 检查消息数据
      if (!res.data) {
        console.warn("收到空消息数据");
        return;
      }

      // 处理ArrayBuffer格式的MQTT消息
      if (res.data instanceof ArrayBuffer) {
        this.parseMQTTMessage(res.data);
        return;
      }

      // 解析消息数据
      let messageData;
      try {
        messageData =
          typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      } catch (parseError) {
        console.warn("消息格式错误:", parseError);
        return;
      }

      console.log("解析后的消息数据:", messageData);

      // 检查消息格式并验证数据
      if (messageData.topic && messageData.payload) {
        // 标准MQTT消息格式：{topic: "xxx", payload: {...}}
        const topic = messageData.topic;
        const payload = messageData.payload;
        this.dispatchMessage(topic, payload);
      } else if (messageData.value !== undefined) {
        // 直接数据格式：{value: "xxx", unit: "xxx", ...}
        this.dispatchMessage("patient/monitor/temperature", messageData);
      } else {
        console.warn("未知消息格式:", messageData);
      }
    } catch (error) {
      console.error("消息处理失败:", error);
    }
  }

  // 解析MQTT二进制消息
  parseMQTTMessage(buffer) {
    try {
      const view = new DataView(buffer);
      let offset = 0;

      // 读取固定头部
      const messageType = (view.getUint8(offset) >> 4) & 0x0f;
      const flags = view.getUint8(offset) & 0x0f;
      offset++;

      // 读取剩余长度
      let remainingLength = 0;
      let multiplier = 1;
      let byte;
      do {
        byte = view.getUint8(offset++);
        remainingLength += (byte & 0x7f) * multiplier;
        multiplier *= 128;
      } while ((byte & 0x80) !== 0);

      console.log(`MQTT消息类型: ${messageType}, 剩余长度: ${remainingLength}`); // 调试用

      // 处理不同类型的消息
      switch (messageType) {
        case 2: // CONNACK
          console.log("收到CONNACK确认");
          break;

        case 3: // PUBLISH
          this.parsePublishMessage(view, offset, remainingLength);
          break;

        case 9: // SUBACK
          console.log("收到SUBACK确认");
          break;

        default:
          console.log(`未处理的MQTT消息类型: ${messageType}`);
      }
    } catch (error) {
      console.error("MQTT消息解析失败:", error);
    }
  }

  // 解析PUBLISH消息
  parsePublishMessage(view, offset, remainingLength) {
    try {
      // 读取主题长度
      const topicLength = view.getUint16(offset);
      offset += 2;

      // 读取主题
      let topic = "";
      for (let i = 0; i < topicLength; i++) {
        topic += String.fromCharCode(view.getUint8(offset++));
      }

      // 读取消息ID（如果QoS > 0）
      // 这里假设QoS = 0，跳过消息ID

      // 读取载荷
      const payloadLength = remainingLength - 2 - topicLength;
      let payload = "";
      for (let i = 0; i < payloadLength; i++) {
        payload += String.fromCharCode(view.getUint8(offset++));
      }

      console.log(`收到PUBLISH消息 - 主题: ${topic}, 载荷: ${payload}`); // 调试用

      // 尝试解析JSON载荷
      try {
        const jsonPayload = JSON.parse(payload);
        this.dispatchMessage(topic, jsonPayload);
      } catch (error) {
        // 如果不是JSON，直接使用字符串
        this.dispatchMessage(topic, { value: payload });
      }
    } catch (error) {
      console.error("PUBLISH消息解析失败:", error);
    }
  }

  // 根据主题分发消息
  dispatchMessage(topic, payload) {
    console.log(`分发消息 - 主题: ${topic}, 数据:`, payload);

    // 硬件端主题适配 (home/devices/onoff/ 前缀)
    if (topic.startsWith("home/devices/onoff/")) {
      this.handleHardwareDeviceTopic(topic, payload);
      return;
    }

    // 环境数据
    if (topic.includes("light")) {
      this.triggerCallback("light", payload);
    } else if (topic.includes("pressure")) {
      this.triggerCallback("pressure", payload);
    } else if (topic.includes("temperature")) {
      this.triggerCallback("temperature", payload);
    } else if (topic.includes("humidity")) {
      this.triggerCallback("humidity", payload);
    }
    // 人体数据
    else if (topic.includes("breathing")) {
      this.triggerCallback("breathing", payload);
    } else if (topic.includes("heart_rate")) {
      this.triggerCallback("heartRate", payload);
    } else if (topic.includes("blood_oxygen")) {
      this.triggerCallback("bloodOxygen", payload);
    } else if (topic.includes("weight-begin")) {
      this.triggerCallback("weightBegin", payload);
    } else if (topic.includes("weight")) {
      this.triggerCallback("weight", payload);
    }
    // 设备状态
    else if (topic.includes("status/device")) {
      this.triggerCallback("deviceStatus", payload);
    }
    // 兼容旧格式
    else if (topic.includes("co2")) {
      this.triggerCallback("co2", payload);
    } else if (topic.includes("other")) {
      this.triggerCallback("other", payload);
    }
  }

  // 处理硬件设备主题 (home/devices/onoff/ 前缀)
  handleHardwareDeviceTopic(topic, payload) {
    console.log(`处理硬件设备主题: ${topic}`, payload);

    // 解析主题路径: home/devices/onoff/[device_type]/[sensor_type]
    const topicParts = topic.split('/');
    if (topicParts.length >= 5) {
      const deviceType = topicParts[3]; // 设备类型
      const sensorType = topicParts[4]; // 传感器类型

      console.log(`设备类型: ${deviceType}, 传感器类型: ${sensorType}`);

      // 根据传感器类型映射到对应的回调
      switch (sensorType.toLowerCase()) {
        case 'temperature':
        case 'temp':
          this.triggerCallback("temperature", payload);
          break;
        case 'humidity':
        case 'hum':
          this.triggerCallback("humidity", payload);
          break;
        case 'light':
        case 'lux':
          this.triggerCallback("light", payload);
          break;
        case 'pressure':
        case 'press':
          this.triggerCallback("pressure", payload);
          break;
        case 'breathing':
        case 'breath':
          this.triggerCallback("breathing", payload);
          break;
        case 'heartrate':
        case 'heart':
          this.triggerCallback("heartRate", payload);
          break;
        case 'oxygen':
        case 'spo2':
          this.triggerCallback("bloodOxygen", payload);
          break;
        default:
          console.warn(`未知的传感器类型: ${sensorType}`);
          // 可以触发一个通用的设备数据回调
          this.triggerCallback("deviceData", {
            deviceType: deviceType,
            sensorType: sensorType,
            data: payload
          });
      }
    } else {
      console.warn(`硬件设备主题格式错误: ${topic}`);
    }
  }

  // 注册消息回调
  onMessage(type, callback) {
    if (!this.callbacks[type]) {
      this.callbacks[type] = [];
    }
    this.callbacks[type].push(callback);
  }

  // 触发回调
  triggerCallback(type, data) {
    console.log(
      `触发回调 - 类型: ${type}, 回调数量: ${
        this.callbacks[type] ? this.callbacks[type].length : 0
      }`
    );
    if (this.callbacks[type]) {
      this.callbacks[type].forEach((callback) => {
        callback(data);
      });
    }
  }

  // 断开连接
  disconnect() {
    this.isConnected = false;

    // 关闭WebSocket连接
    try {
      wx.closeSocket({
        success: (res) => {
          console.log("WebSocket连接关闭成功:", res);
        },
        fail: (error) => {
          console.error("关闭WebSocket连接失败:", error);
        },
      });
    } catch (error) {
      console.error("关闭WebSocket连接失败:", error);
    }

    // 通知app更新全局状态
    const app = getApp();
    if (app && app.updateMQTTStatus) {
      app.updateMQTTStatus(false);
    }

    console.log("MQTT连接已断开");
  }

  // 发布消息
  publish(topic, payload) {
    if (!this.isConnected) {
      console.warn("MQTT未连接，无法发布消息");
      this.showAlert("设备未连接，无法控制", "warning");
      return false;
    }

    try {
      console.log(`发布消息到主题: ${topic}`, payload);

      // 构建MQTT PUBLISH包
      const messageId = Date.now() % 65535;
      const payloadStr = JSON.stringify(payload);

      // 计算长度
      const topicLength = topic.length;
      const payloadLength = payloadStr.length;
      const variableHeaderLength = 2 + topicLength; // Topic length + Topic (QoS 0, 无Message ID)
      const totalLength = variableHeaderLength + payloadLength;

      // 创建ArrayBuffer
      const buffer = new ArrayBuffer(totalLength + 2); // +2 for fixed header
      const view = new DataView(buffer);
      let offset = 0;

      // Fixed Header
      view.setUint8(offset++, 0x30); // PUBLISH消息类型, QoS 0
      view.setUint8(offset++, totalLength); // 剩余长度

      // Variable Header
      // Topic length
      view.setUint16(offset, topicLength);
      offset += 2;

      // Topic
      for (let i = 0; i < topicLength; i++) {
        view.setUint8(offset++, topic.charCodeAt(i));
      }

      // Payload
      for (let i = 0; i < payloadLength; i++) {
        view.setUint8(offset++, payloadStr.charCodeAt(i));
      }

      console.log(
        `发送MQTT PUBLISH包，主题: ${topic}, 载荷: ${payloadStr}, 长度:`,
        buffer.byteLength
      );

      // 发送二进制数据
      wx.sendSocketMessage({
        data: buffer,
        success: (res) => {
          console.log(`消息发布成功: ${topic}`, res);
          this.showAlert("控制命令已发送", "success");
        },
        fail: (error) => {
          console.error(`消息发布失败: ${topic}`, error);
          this.showAlert("控制命令发送失败", "error");
        },
      });

      return true;
    } catch (error) {
      console.error(`发布消息失败: ${topic}`, error);
      this.showAlert("控制命令发送失败", "error");
      return false;
    }
  }

  // 获取连接状态
  getStatus() {
    return this.isConnected;
  }

  // 验证数据有效性
  validateData(topic, data) {
    try {
      // 解析payload如果是字符串
      let payload = data;
      if (typeof data === "string") {
        payload = JSON.parse(data);
      }

      // 检查基本字段
      if (
        !payload.value ||
        payload.value === null ||
        payload.value === undefined
      ) {
        this.showAlert("数据值缺失", "warning");
        return false;
      }

      const value = parseFloat(payload.value);
      if (isNaN(value)) {
        this.showAlert("数据格式错误", "warning");
        return false;
      }

      // 根据主题检查数据范围
      if (topic.includes("temperature")) {
        if (value < 30 || value > 45) {
          this.showAlert(`体温数据异常: ${value}°C`, "danger");
          return true; // 异常数据也要显示，但要提醒
        }
      } else if (topic.includes("co2")) {
        if (value < 0 || value > 50000) {
          this.showAlert(`CO2数据异常: ${value}ppm`, "danger");
          return true;
        }
      } else if (topic.includes("breathing")) {
        if (value < 0 || value > 100) {
          this.showAlert(`呼吸数据异常: ${value}次/分`, "danger");
          return true;
        }
      }

      return true;
    } catch (error) {
      this.showAlert("数据验证失败", "error");
      return false;
    }
  }

  // 显示异常提醒
  showAlert(message, type = "info") {
    if (!config.alerts.enabled) return;

    // 显示Toast提醒
    if (config.alerts.showToast) {
      const icon =
        type === "error" ? "error" : type === "warning" ? "none" : "success";
      wx.showToast({
        title: message,
        icon: icon,
        duration: 2000,
      });
    }

    // 震动提醒
    if (config.alerts.vibrate && (type === "error" || type === "danger")) {
      wx.vibrateShort();
    }
  }
}

// 创建单例
const mqttClient = new MQTTClient();

module.exports = mqttClient;
