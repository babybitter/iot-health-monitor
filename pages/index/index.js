// 患者健康监测主页
const config = require("../../config/config.js");
const mqttClient = require("../../utils/mqtt.js");

Page({
  data: {
    // 导航栏相关
    statusBarHeight: 0, // 状态栏高度
    navHeight: 0, // 导航栏总高度

    patientName: "患者", // 患者姓名
    mqttConnected: false, // MQTT连接状态
    monitorData: config.monitorData, // 监测数据
    refreshTimer: null, // 刷新定时器
    dataTimer: null, // 数据定时器

    tempo: "0", // 温度
    hum: "0", // 湿度
    lx: "0", // 光照强度
    // 执行模块控制变量
    light: false, // 灯光状态
    buzzer: false, // 蜂鸣器状态
    humidifier: false, // 加湿器状态
    fan: false, // 风扇状态


  },

  onLoad() {
    this.initNavBar(); // 初始化导航栏
    this.initPage();
    this.initMQTT(); // 初始化MQTT连接
  },

  onShow() {
    this.startRefreshTimer();
    this.refreshMonitorData(); // 页面显示时刷新数据
  },

  onHide() {
    this.stopRefreshTimer();
  },

  onUnload() {
    this.stopRefreshTimer();
    if (this.dataTimer) {
      clearInterval(this.dataTimer);
    }
    // 断开MQTT连接
    if (mqttClient.getStatus()) {
      mqttClient.disconnect();
    }
  },

  // 初始化页面
  initPage() {
    // 获取患者信息
    const patientInfo = wx.getStorageSync("patient_info");
    if (patientInfo) {
      this.setData({
        patientName: patientInfo.name || "患者",
      });
    }
  },

  // 格式化日期时间
  formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  },

  // 刷新数据
  refreshData() {
    wx.showToast({
      title: "数据已刷新",
      icon: "success",
    });
  },

  // 刷新监测数据
  refreshMonitorData() {
    const app = getApp();
    const globalData = app.globalData.monitorData;

    // 从全局数据更新本地数据
    const updateData = {};
    Object.keys(globalData).forEach((type) => {
      if (globalData[type].value !== "--") {
        updateData[`monitorData.${type}.value`] = globalData[type].value;
        updateData[`monitorData.${type}.lastUpdate`] =
          globalData[type].lastUpdate || this.formatDateTime(new Date());
        updateData[`monitorData.${type}.status`] = this.getDataStatus(
          type,
          globalData[type].value
        );
      }
    });

    this.setData(updateData);
  },

  // 启动刷新定时器
  startRefreshTimer() {
    // 每30秒刷新一次显示
    this.refreshTimer = setInterval(() => {
      // 刷新页面数据
    }, 30000);
  },

  // 停止刷新定时器
  stopRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  },

  // 获取数据单位
  getDataUnit(type) {
    const units = {
      // 环境数据
      light: "lx",
      pressure: "Pa",
      temperature: "℃",
      humidity: "%",
      // 人体数据
      breathing: "次/分",
      heartRate: "次/分",
      bloodOxygen: "%",
      bodyTemperature: "°C",
      weight: "g",
    };
    return units[type] || "";
  },

  // 卡片点击事件
  onCardTap(e) {
    const type = e.currentTarget.dataset.type;
    const data = this.data.monitorData[type];

    if (data) {
      const unit = this.getDataUnit(type);
      wx.showModal({
        title: `${this.getCardTitle(type)}详情`,
        content: `当前值: ${data.value} ${unit}\n更新时间: ${
          data.lastUpdate || "--"
        }`,
        showCancel: false,
      });
    }
  },

  // 获取卡片标题
  getCardTitle(type) {
    const titles = {
      // 环境数据
      light: "光照",
      pressure: "气压",
      temperature: "温度",
      humidity: "湿度",
      // 人体数据
      breathing: "呼吸频率",
      heartRate: "心跳频率",
      bloodOxygen: "血氧",
      bodyTemperature: "体温",
      weight: "重量",
    };
    return titles[type] || type;
  },

  // 跳转到AI助手页面
  goToAIDoctor() {
    wx.switchTab({
      url: "/pages/ai-doctor/ai-doctor",
    });
  },

  // 初始化MQTT连接
  async initMQTT() {
    try {
      // 注册环境数据回调
      mqttClient.onMessage("light", (data) => {
        this.updateMonitorData("light", data);
      });

      mqttClient.onMessage("pressure", (data) => {
        this.updateMonitorData("pressure", data);
      });

      mqttClient.onMessage("temperature", (data) => {
        this.updateMonitorData("temperature", data);
      });

      mqttClient.onMessage("humidity", (data) => {
        this.updateMonitorData("humidity", data);
      });

      // 注册人体数据回调
      mqttClient.onMessage("breathing", (data) => {
        this.updateMonitorData("breathing", data);
      });

      mqttClient.onMessage("heartRate", (data) => {
        this.updateMonitorData("heartRate", data);
      });

      mqttClient.onMessage("bloodOxygen", (data) => {
        this.updateMonitorData("bloodOxygen", data);
      });

      mqttClient.onMessage("bodyTemperature", (data) => {
        this.updateMonitorData("bodyTemperature", data);
      });

      // 注册设备状态回调
      mqttClient.onMessage("deviceStatus", (data) => {
        this.updateDeviceStatus(data);
      });

      // 连接MQTT服务器
      await mqttClient.connect();
      this.setData({ mqttConnected: true });

      wx.showToast({
        title: "MQTT连接成功",
        icon: "success",
      });
    } catch (error) {
      this.setData({ mqttConnected: false });

      wx.showToast({
        title: "MQTT连接失败",
        icon: "error",
      });
    }
  },

  // 更新监测数据
  updateMonitorData(type, data) {
    const timeStr = this.formatDateTime(new Date());
    const updateData = {};

    // 处理不同格式的数据
    let value;
    if (typeof data === 'object' && data.value !== undefined) {
      // 标准格式: {value: xxx}
      value = data.value;
    } else {
      // 直接数值格式: 26.98
      value = data;
    }

    // 如果是字符串格式，根据类型处理
    if (typeof value === 'string') {
      if (type === 'pressure') {
        // 气压测试数据保持原始格式显示 "data: 196"
        // 不做任何处理，直接使用
      } else {
        // 其他数据转换为数值
        value = parseFloat(value);
        // 确保value是有效数值
        if (isNaN(value)) {
          console.warn(`${type} 数据格式错误:`, data);
          return;
        }
      }
    } else {
      // 数值类型，确保是有效数值
      if (isNaN(value)) {
        console.warn(`${type} 数据格式错误:`, data);
        return;
      }
    }

    updateData[`monitorData.${type}.value`] = value;
    updateData[`monitorData.${type}.lastUpdate`] = timeStr;

    // 同步更新兼容变量
    if (type === "temperature") {
      updateData["tempo"] = value;
    } else if (type === "humidity") {
      updateData["hum"] = value; // 兼容原湿度变量
    } else if (type === "light") {
      updateData["lx"] = value; // 兼容原光照变量
    }

    // 根据阈值设置状态
    const thresholds = config.thresholds[type];
    let status = "normal";
    if (thresholds && typeof value === 'number') {
      // 只对数值类型的数据进行阈值判断
      if (value >= thresholds.normal[0] && value <= thresholds.normal[1]) {
        status = "normal";
      } else if (
        value >= thresholds.warning[0] &&
        value <= thresholds.warning[1]
      ) {
        status = "warning";
      } else {
        status = "danger";
      }
    } else if (typeof value === 'string') {
      // 字符串类型数据（如测试数据）默认为正常状态
      status = "normal";
    }
    updateData[`monitorData.${type}.status`] = status;

    // 更新页面数据
    this.setData(updateData);

    //同步更新全局数据，供AI助手页面使用
    const app = getApp();
    if (app && app.globalData && app.globalData.monitorData) {
      app.globalData.monitorData[type] = {
        ...app.globalData.monitorData[type],
        value: value,
        lastUpdate: timeStr,
        status: status
      };
    }
  },

  // 更新设备状态
  updateDeviceStatus(data) {
    // 设备状态数据格式: { device: "light", status: true, timestamp: 1678901234567 }
    if (data.device && data.status !== undefined) {
      const updateData = {};

      // 根据设备类型更新对应状态
      switch (data.device) {
        case "light":
          updateData["light"] = data.status;
          break;
        case "buzzer":
          updateData["buzzer"] = data.status;
          break;
        case "humidifier":
          updateData["humidifier"] = data.status;
          break;
        case "fan":
          updateData["fan"] = data.status;
          break;
      }

      if (Object.keys(updateData).length > 0) {
        this.setData(updateData);
      }
    }
  },



  // 发送设备控制命令
  sendDeviceControl(device, status) {
    const controlData = {
      device: device,
      action: "toggle",
      value: status,
      timestamp: Date.now(),
    };

    // 发布到设备控制主题
    const success = mqttClient.publish(config.mqtt.publishTopic, controlData);

    if (!success) {
      // 如果发送失败，恢复原状态
      const revertData = {};
      revertData[device] = !status;
      this.setData(revertData);
    }

    return success;
  },

  // 刷新开关处理
  onRefreshChange(e) {
    if (e.detail.value) {
      this.refreshData();
      wx.showToast({
        title: "数据已刷新",
        icon: "success",
      });
    }
  },

  // 连接开关处理
  onConnectionChange(e) {
    if (e.detail.value && !this.data.mqttConnected) {
      this.connectMQTT();
    } else if (!e.detail.value && this.data.mqttConnected) {
      wx.showModal({
        title: "断开连接",
        content: "确定要断开设备连接吗？",
        success: (res) => {
          if (res.confirm) {
            this.setData({ mqttConnected: false });
            wx.showToast({
              title: "已断开连接",
              icon: "none",
            });
          }
        },
      });
    }
  },

  // 连接MQTT
  connectMQTT() {
    this.initMQTT();
  },

  // 灯光控制
  onLightChange: function (event) {
    let sw = event.detail.value;

    // 先更新本地状态
    this.setData({ light: sw });

    // 发送控制命令
    const success = this.sendDeviceControl("light", sw);

    if (success) {
      wx.showToast({
        title: sw ? "灯光已开启" : "灯光已关闭",
        icon: "success",
      });
    }
  },

  // 蜂鸣器控制
  onBuzzerChange: function (event) {
    let sw = event.detail.value;

    // 先更新本地状态
    this.setData({ buzzer: sw });

    // 发送控制命令
    const success = this.sendDeviceControl("buzzer", sw);

    if (success) {
      wx.showToast({
        title: sw ? "蜂鸣器已开启" : "蜂鸣器已关闭",
        icon: "success",
      });
    }
  },

  // 加湿器控制
  onHumidifierChange: function (event) {
    let sw = event.detail.value;

    // 先更新本地状态
    this.setData({ humidifier: sw });

    // 发送控制命令
    const success = this.sendDeviceControl("humidifier", sw);

    if (success) {
      wx.showToast({
        title: sw ? "加湿器已开启" : "加湿器已关闭",
        icon: "success",
      });
    }
  },

  // 风扇控制
  onFanChange: function (event) {
    let sw = event.detail.value;

    // 先更新本地状态
    this.setData({ fan: sw });

    // 发送控制命令
    const success = this.sendDeviceControl("fan", sw);

    if (success) {
      wx.showToast({
        title: sw ? "风扇已开启" : "风扇已关闭",
        icon: "success",
      });
    }
  },

  // 获取数据状态
  getDataStatus: function (type, value) {
    // 数据阈值配置
    const thresholds = {
      light: { normal: [200, 1000], warning: [100, 200], danger: [0, 100] },
      pressure: {
        normal: [1000, 1030],
        warning: [980, 1000],
        danger: [950, 980],
      },
      temperature: { normal: [18, 26], warning: [26, 30], danger: [30, 40] },
      humidity: { normal: [40, 70], warning: [30, 40], danger: [0, 30] },
      breathing: { normal: [12, 20], warning: [8, 12], danger: [0, 8] },
      heartRate: { normal: [60, 100], warning: [50, 60], danger: [0, 50] },
      bloodOxygen: { normal: [95, 100], warning: [90, 95], danger: [0, 90] },
    };

    const threshold = thresholds[type];
    if (!threshold) return "normal"; // 默认正常状态

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "normal";

    // 判断状态
    if (numValue >= threshold.normal[0] && numValue <= threshold.normal[1]) {
      return "normal";
    } else if (
      numValue >= threshold.warning[0] &&
      numValue <= threshold.warning[1]
    ) {
      return "warning";
    } else {
      return "danger";
    }
  },

  // 初始化导航栏
  initNavBar() {
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight;
    const navHeight = statusBarHeight + 44; // 状态栏高度 + 导航栏内容高度

    this.setData({
      statusBarHeight,
      navHeight,
    });
  },
});
