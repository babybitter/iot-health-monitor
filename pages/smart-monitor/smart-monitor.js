// 智能输液监控页面
const config = require("../../config/config.js");
const mqttClient = require("../../utils/mqtt.js");

Page({
  data: {
    // 导航栏相关
    statusBarHeight: 0, // 状态栏高度
    navHeight: 0, // 导航栏总高度

    // 重量监测相关变量
    weightBegin: 0, // 初始重量(克)
    weightWarningThreshold: 0, // 警告阈值(克)
    weightRemaining: 0, // 剩余重量(克)
    remainingPercentage: 0, // 剩余百分比
    liquidHeight: 100, // 液体高度百分比

    // 输液速度监测
    infusionSpeed: 0, // 输液速度(滴/分钟)
    speedStatus: 'normal', // 速度状态: normal, warning, danger
    speedStatusText: '正常', // 状态文本

    // MQTT连接状态
    mqttConnected: false,

    // 警告控制
    hasShownWarning: false, // 是否已经显示过警告
    isInDangerZone: false, // 当前是否处于危险区域
    lastSafeWeight: 0 // 上次安全重量值
  },

  onLoad() {
    this.initNavBar(); // 初始化导航栏
    this.initMQTT(); // 初始化MQTT连接
  },

  onShow() {
    // 页面显示时刷新数据
    this.refreshData();
  },

  onUnload() {
    // 页面卸载时断开MQTT连接
    if (mqttClient.getStatus()) {
      mqttClient.disconnect();
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

  // 初始化MQTT连接
  async initMQTT() {
    try {
      // 注册重量数据回调
      mqttClient.onMessage("weightBegin", (data) => {
        this.handleWeightBegin(data);
      });

      mqttClient.onMessage("weight", (data) => {
        this.handleWeight(data);
      });

      // 注册输液速度数据回调
      mqttClient.onMessage("infusionSpeed", (data) => {
        this.handleInfusionSpeed(data);
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

  // 处理硬件端发送的初始重量数据
  handleWeightBegin(data) {
    // 兼容不同数据格式：对象{value: 8}或直接数字8或字符串"8"
    let weight;
    if (typeof data === 'object' && data.value !== undefined) {
      weight = parseFloat(data.value);
    } else {
      weight = parseFloat(data);
    }

    if (!isNaN(weight) && weight > 0) {
      const threshold = parseFloat((weight * 0.05).toFixed(2)); // 设置警告阈值为初始重量的5%
      
      this.setData({
        weightBegin: weight,
        weightWarningThreshold: threshold,
        remainingPercentage: 100,
        liquidHeight: 100
      });

      wx.showToast({
        title: `接收到初始重量: ${weight}g`,
        icon: 'success'
      });
    }
  },

  // 处理硬件端发送的实时重量数据
  handleWeight(data) {
    // 兼容不同数据格式：对象{value: 10}或直接数字10或字符串"10"
    let remaining;
    if (typeof data === 'object' && data.value !== undefined) {
      remaining = parseFloat(data.value);
    } else {
      remaining = parseFloat(data);
    }

    if (!isNaN(remaining) && remaining >= 0) {
      // 计算剩余百分比
      const percentage = this.data.weightBegin > 0 
        ? Math.max(0, Math.min(100, (remaining / this.data.weightBegin) * 100))
        : 0;

      // 计算液体高度（最小保持5%显示效果）
      const liquidHeight = Math.max(5, percentage);

      this.setData({
        weightRemaining: remaining,
        remainingPercentage: parseFloat(percentage.toFixed(1)),
        liquidHeight: liquidHeight
      });

      // 检查警告逻辑
      this.checkWarningLogic(remaining);
    }
  },

  // 处理输液速度数据
  handleInfusionSpeed(data) {
    // 兼容不同数据格式：对象{value: 60}或直接数字60或字符串"60"
    let speed;
    if (typeof data === 'object' && data.value !== undefined) {
      speed = parseFloat(data.value);
    } else {
      speed = parseFloat(data);
    }

    if (!isNaN(speed) && speed >= 0) {
      // 判断速度状态
      let status = 'normal';
      let statusText = '正常';

      if (speed < 20) {
        status = 'warning';
        statusText = '偏慢';
      } else if (speed > 80) {
        status = 'danger';
        statusText = '过快';
      }

      this.setData({
        infusionSpeed: Math.round(speed),
        speedStatus: status,
        speedStatusText: statusText
      });
    }
  },

  // 检查警告逻辑（新的触发机制）
  checkWarningLogic(currentWeight) {
    const threshold = this.data.weightWarningThreshold;
    const isCurrentlyInDanger = currentWeight <= threshold && currentWeight > 0;
    const wasInDanger = this.data.isInDangerZone;

    if (isCurrentlyInDanger && !wasInDanger) {
      // 刚刚进入危险区域，显示警告
      console.log(`液体重量从安全区域(${this.data.lastSafeWeight}g)进入危险区域(${currentWeight}g)`);
      this.showLowLiquidWarning();
      this.setData({
        hasShownWarning: true,
        isInDangerZone: true
      });
    } else if (!isCurrentlyInDanger && wasInDanger) {
      // 从危险区域恢复到安全区域
      console.log(`液体重量从危险区域恢复到安全区域(${currentWeight}g)`);
      this.setData({
        hasShownWarning: false,
        isInDangerZone: false,
        lastSafeWeight: currentWeight
      });
    } else if (isCurrentlyInDanger && wasInDanger) {
      // 持续在危险区域，不弹窗，只记录日志
      console.log(`液体重量持续在危险区域: ${currentWeight}g (阈值: ${threshold}g)`);
    } else {
      // 持续在安全区域，更新安全重量记录
      this.setData({
        lastSafeWeight: currentWeight
      });
    }
  },

  // 显示低液体警告
  showLowLiquidWarning() {
    const remainingPercentage = this.data.remainingPercentage || 0;

    wx.showModal({
      title: '液体不足警告',
      content: `当前液体剩余: ${this.data.weightRemaining}g\n警告阈值: ${this.data.weightWarningThreshold}g\n剩余百分比: ${remainingPercentage}%\n\n请及时更换输液瓶！`,
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#ff5757',
      success: (res) => {
        if (res.confirm) {
          console.log('用户确认了液体不足警告，在液体恢复到安全值之前不会再次弹出');
          // 用户确认后，标记已显示警告，直到恢复安全值才会重新弹出
          this.setData({
            hasShownWarning: true
          });
        }
      }
    });
  },

  // 重置警告状态（当液体恢复安全或手动处理时）
  resetWarningState() {
    this.setData({
      hasShownWarning: false,
      isInDangerZone: false
    });
    console.log('警告状态已重置，可以重新监控液体不足情况');
  },

  // 发送蜂鸣器警告
  sendWeightDrive() {
    const payload = { action: 'start', type: 'low_liquid' };
    if (mqttClient.publish('patient/monitor/weight-drive', payload)) {
      wx.showToast({
        title: '蜂鸣器警告已触发',
        icon: 'success'
      });

      // 手动触发蜂鸣器时，重置警告状态
      // 表示用户已经知道并处理了液体不足问题
      this.resetWarningState();
    } else {
      wx.showToast({
        title: '发送失败，请检查连接',
        icon: 'error'
      });
    }
  },

  // 获取当前警告状态（用于调试）
  getWarningStatus() {
    return {
      hasShownWarning: this.data.hasShownWarning,
      isInDangerZone: this.data.isInDangerZone,
      lastSafeWeight: this.data.lastSafeWeight,
      currentWeight: this.data.weightRemaining,
      threshold: this.data.weightWarningThreshold
    };
  },

  // 刷新数据
  refreshData() {
    // 从全局数据或缓存中恢复数据
    const app = getApp();
    if (app && app.globalData) {
      // 可以从全局数据中获取最新的重量数据
      const globalMonitorData = app.globalData.monitorData;
      if (globalMonitorData && globalMonitorData.weight) {
        this.handleWeight(globalMonitorData.weight);
      }
    }
  }
});
