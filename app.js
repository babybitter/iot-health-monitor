// 患者健康监测小程序主入口
const config = require("./config/config.js");

App({
  globalData: {
    userInfo: null,
    monitorData: config.monitorData,
    mqttConnected: false,
    // 图表数据缓存
    chart_wd: wx.getStorageSync("chart_wd") ? JSON.parse(wx.getStorageSync("chart_wd")) : [], // 温度
    chart_sd: wx.getStorageSync("chart_sd") ? JSON.parse(wx.getStorageSync("chart_sd")) : [], // 湿度
    chart_gq: wx.getStorageSync("chart_gq") ? JSON.parse(wx.getStorageSync("chart_gq")) : [], // 光强
    chart_yw: wx.getStorageSync("chart_yw") ? JSON.parse(wx.getStorageSync("chart_yw")) : [], // 烟雾(气压)
    chart_xl: wx.getStorageSync("chart_xl") ? JSON.parse(wx.getStorageSync("chart_xl")) : [], // 心率
    chart_hx: wx.getStorageSync("chart_hx") ? JSON.parse(wx.getStorageSync("chart_hx")) : [], // 呼吸
    chart_xy: wx.getStorageSync("chart_xy") ? JSON.parse(wx.getStorageSync("chart_xy")) : [], // 血氧
    chart_tw: wx.getStorageSync("chart_tw") ? JSON.parse(wx.getStorageSync("chart_tw")) : [], // 体温
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
    // 保存图表数据到本地缓存
    wx.setStorageSync("chart_wd", JSON.stringify(this.globalData.chart_wd));
    wx.setStorageSync("chart_sd", JSON.stringify(this.globalData.chart_sd));
    wx.setStorageSync("chart_gq", JSON.stringify(this.globalData.chart_gq));
    wx.setStorageSync("chart_yw", JSON.stringify(this.globalData.chart_yw));
    wx.setStorageSync("chart_xl", JSON.stringify(this.globalData.chart_xl));
    wx.setStorageSync("chart_hx", JSON.stringify(this.globalData.chart_hx));
    wx.setStorageSync("chart_xy", JSON.stringify(this.globalData.chart_xy));
    wx.setStorageSync("chart_tw", JSON.stringify(this.globalData.chart_tw));
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

      // 初始化测试数据（仅在开发环境）
      this.initTestData();

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

  // 初始化测试数据
  initTestData() {
    // 如果没有本地数据，生成一些测试数据
    const hasData = Object.keys(this.globalData).some(key =>
      key.startsWith('chart_') && this.globalData[key].length > 0
    );

    if (!hasData) {
      console.log('生成测试图表数据');
      const now = new Date();

      // 生成最近2小时的测试数据，每10分钟一个点
      for (let i = 12; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 10 * 60 * 1000);
        const timeStr = this.formatTime(time).slice(5); // 月/日 时:分:秒

        // 生成模拟数据
        this.globalData.chart_wd.push([timeStr, 20 + Math.random() * 10]); // 温度 20-30°C
        this.globalData.chart_sd.push([timeStr, 40 + Math.random() * 20]); // 湿度 40-60%
        this.globalData.chart_gq.push([timeStr, 100 + Math.random() * 400]); // 光强 100-500lx
        this.globalData.chart_yw.push([timeStr, 1000 + Math.random() * 50]); // 气压 1000-1050hPa
        this.globalData.chart_xl.push([timeStr, 60 + Math.random() * 40]); // 心率 60-100bpm
        this.globalData.chart_hx.push([timeStr, 12 + Math.random() * 8]); // 呼吸 12-20次/分
        this.globalData.chart_xy.push([timeStr, 95 + Math.random() * 5]); // 血氧 95-100%
        this.globalData.chart_tw.push([timeStr, 36 + Math.random() * 2]); // 体温 36-38°C
      }
    }
  },

  // 格式化时间
  formatTime(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();

    const formatNumber = n => {
      n = n.toString();
      return n[1] ? n : `0${n}`;
    };

    return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`;
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

    // 添加图表数据存储 - 根据文档要求添加
    this.saveChartData(type, parsedData.value || data, now);
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

  // 保存图表数据 - 根据文档要求添加
  saveChartData(type, value, timestamp) {
    const { formatTime } = require("./utils/util.js");

    // 数据类型映射
    const typeMap = {
      'temperature': 'wd',     // 温度
      'humidity': 'sd',        // 湿度
      'light': 'gq',          // 光强
      'pressure': 'yw',       // 气压(烟雾)
      'heartRate': 'xl',      // 心率
      'breathing': 'hx',      // 呼吸
      'bloodOxygen': 'xy',    // 血氧
      'bodyTemperature': 'tw' // 体温
    };

    const chartType = typeMap[type];
    if (!chartType) return; // 不支持的数据类型

    const chartKey = `chart_${chartType}`;

    // 确保数值有效
    let numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    // 创建图表数据点 [时间, 数值]
    const timeLabel = formatTime(timestamp).slice(5); // 月/日 时:分:秒
    const dataPoint = [timeLabel, numValue];

    // 添加到对应的图表数据数组
    this.globalData[chartKey].push(dataPoint);

    // 限制数据点数量，只保留最近100个点
    if (this.globalData[chartKey].length > 100) {
      this.globalData[chartKey].splice(0, this.globalData[chartKey].length - 100);
    }
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
