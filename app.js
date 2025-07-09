// 患者健康监测小程序主入口
const config = require("./config/config.js");

App({
  globalData: {
    userInfo: null,
    monitorData: config.monitorData,
    mqttConnected: false,
  },

  onLaunch() {
    this.initApp();
  },

  onShow() {
    // 检查MQTT连接状态
    this.checkMQTTConnection();
  },

  onHide() {
    // 小程序隐藏时保持MQTT连接
  },

  // 初始化应用
  async initApp() {
    try {
      // 初始化日志
      const logs = wx.getStorageSync("logs") || [];
      logs.unshift(Date.now());
      wx.setStorageSync("logs", logs);

      // 加载用户信息
      this.loadUserInfo();

      // 初始化MQTT连接（不阻塞应用启动）
      this.initMQTT().catch((error) => {
        // MQTT初始化失败，但应用继续启动
      });

      // 登录获取openId
      this.wxLogin();
    } catch (error) {
      // 应用初始化失败
    }
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync("user_info");
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
  },

  // 初始化MQTT连接
  async initMQTT() {
    try {
      // 创建MQTT客户端占位符
      this.mqttClient = {
        onMessage: (topic, callback) => {
          // 设置监听器
        },
      };

      this.globalData.mqttConnected = true;

      // 设置消息监听
      this.setupMQTTListeners();
    } catch (error) {
      this.globalData.mqttConnected = false;
    }
  },

  // 设置MQTT消息监听
  setupMQTTListeners() {
    const dataTypes = [
      "light",
      "pressure",
      "temperature",
      "humidity",
      "breathing",
      "heartRate",
      "bloodOxygen",
    ];

    dataTypes.forEach((type) => {
      this.mqttClient.onMessage(type, (data) => {
        this.updateMonitorData(type, data);
      });
    });
  },

  // 更新监测数据
  updateMonitorData(type, data) {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);

    // 解析数据
    let parsedData = data;
    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch (error) {
        parsedData = { value: "--" };
      }
    }

    // 更新全局数据
    this.globalData.monitorData[type] = {
      ...this.globalData.monitorData[type],
      value: parsedData.value || "--",
      lastUpdate: timeStr,
    };

    // 保存历史数据
    this.saveHealthHistory(type, parsedData.value, now);
  },

  // 保存健康历史数据
  saveHealthHistory(type, value, timestamp) {
    const history = wx.getStorageSync("health_history") || [];

    const record = {
      type: type,
      value: value,
      timestamp: timestamp.getTime(),
      date: timestamp.toDateString(),
    };

    history.push(record);

    // 只保留最近1000条记录
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    wx.setStorageSync("health_history", history);
  },

  // 微信登录
  wxLogin() {
    wx.login({
      success: (res) => {
        if (res.code) {
          // 这里可以发送code到后台换取openId
        }
      },
    });
  },

  // 获取MQTT连接状态
  getMQTTStatus() {
    return this.globalData.mqttConnected;
  },

  // 更新MQTT连接状态
  updateMQTTStatus(connected) {
    this.globalData.mqttConnected = connected;
  },

  // 检查MQTT连接状态
  checkMQTTConnection() {
    if (!this.globalData.mqttConnected) {
      setTimeout(() => {
        if (!this.globalData.mqttConnected) {
          wx.showToast({
            title: "设备连接中断",
            icon: "none",
            duration: 2000,
          });
        }
      }, config.alerts.dataTimeout);
    }
  },

  // 重新连接MQTT
  async reconnectMQTT() {
    return await this.initMQTT();
  },

  // 通知页面MQTT连接成功
  notifyPagesOfMQTTConnection() {
    const pages = getCurrentPages();
    if (pages.length > 0) {
      const currentPage = pages[pages.length - 1];

      if (
        currentPage.route === "pages/index/index" &&
        typeof currentPage.setupMQTTListeners === "function"
      ) {
        currentPage.setupMQTTListeners();
      }
    }
  },
});
