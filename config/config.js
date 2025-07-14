// 统一配置文件
const config = {
  // 环境配置
  environment: 'production', // 生产环境
  // MQTT配置
  mqtt: {
    // 开发环境（需要在开发者工具中关闭域名校验）
    hostDev: 'ws://47.122.130.135:8083/mqtt',
    // 生产环境（SSL证书配置完成后使用）
    hostProd: 'wss://mqtt.healthtrack.top:8084/mqtt',
    // 当前使用的连接
    host: 'ws://47.122.130.135:8083/mqtt', // 生产环境WS连接（稳定版本）
    clientId: 'patient_monitor_' + Date.now(), // 动态客户端ID，避免冲突
    username: 'test', // MQTT服务器用户名
    password: 'test123', // MQTT服务器密码
    keepalive: 60,
    clean: true,
    reconnectPeriod: 3000, // 重连间隔
    connectTimeout: 30000, // 连接超时
    topics: {
      // 环境数据
      light: 'patient/monitor/light', // 光照数据
      pressure: 'patient/monitor/pressure', // 气压数据
      temperature: 'patient/monitor/temperature', // 温度数据
      humidity: 'patient/monitor/humidity', // 湿度数据
      // 人体数据
      breathing: 'patient/monitor/breathing', // 呼吸频率数据
      heartRate: 'patient/monitor/heart_rate', // 心跳频率数据
      bloodOxygen: 'patient/monitor/blood_oxygen', // 血氧数据
      bodyTemperature: 'patient/monitor/body-temperature', // 体温数据
      weight: 'patient/monitor/weight', // 重量数据
      weightBegin: 'patient/monitor/weight-begin', // 初始重量数据
      infusionSpeed: 'patient/monitor/infusion-speed', // 输液速度数据
      // 设备状态
      deviceStatus: 'patient/status/device', // 设备状态反馈主题
      // 新增主题
      dataUpload: 'patient/upload/data', // 数据上传主题（用于设备主动上报业务数据）
      deviceAdvice: 'patient/advice/device', // 建议主题（用于向设备下发建议）
      vitalTemperature: 'patient/upload/data/temperature', // 体温数据专用上报通道
      // 硬件端兼容主题
      hardwareDevices: 'home/devices/onoff/#' // 订阅硬件端所有子主题
    },
    publishTopic: 'patient/control/device' // 设备控制发布主题
  },
  
  // Coze API配置
  ai: {
    baseUrl: 'https://api.coze.cn/open_api/v2/chat', // 中国版端点
    // 备用端点: 'https://api.coze.com/open_api/v2/chat' (国际版)
    apiKey: 'pat_MLV34Er7REuA1og5WIGfq1LKzZdNDdYLZlkISChL9e12PaVoifTBKGiTR47rmUcu', // Coze API密钥 (已更新)
    botId: '7520634183127941160', // 机器人ID (已更新)
    userId: '123456789', // 用户ID
    maxTokens: 1000,
    temperature: 0.7,
    stream: false, // Coze暂不支持流式输出
    debug: true // 启用调试模式
  },
  
  // 监测数据默认值
  monitorData: {
    // 环境数据
    light: { value: '--', status: 'normal', lastUpdate: '--' },
    pressure: { value: '--', status: 'normal', lastUpdate: '--' },
    temperature: { value: '--', status: 'normal', lastUpdate: '--' },
    humidity: { value: '--', status: 'normal', lastUpdate: '--' },
    // 人体数据
    breathing: { value: '--', status: 'normal', lastUpdate: '--' },
    heartRate: { value: '--', status: 'normal', lastUpdate: '--' },
    bloodOxygen: { value: '--', status: 'normal', lastUpdate: '--' },
    bodyTemperature: { value: '--', status: 'normal', lastUpdate: '--' },
    weight: { value: '--', status: 'normal', lastUpdate: '--' }
  },
  
  // 状态阈值配置
  thresholds: {
    // 环境数据阈值
    light: { normal: [200, 1000], warning: [100, 200], danger: [0, 100] },
    pressure: { normal: [1000, 1030], warning: [980, 1000], danger: [950, 980] },
    temperature: { normal: [18, 26], warning: [26, 30], danger: [30, 40] },
    humidity: { normal: [40, 70], warning: [30, 40], danger: [0, 30] },
    // 人体数据阈值
    breathing: { normal: [12, 20], warning: [20, 30], danger: [30, 60] },
    heartRate: { normal: [60, 100], warning: [100, 120], danger: [120, 200] },
    bloodOxygen: { normal: [95, 100], warning: [90, 95], danger: [0, 90] },
    bodyTemperature: { normal: [36.0, 37.5], warning: [37.5, 38.5], danger: [38.5, 42.0] }
  },
  
  // UI配置
  ui: {
    colors: {
      primary: '#3cc51f', // 重要按钮绿色
      secondary: '#ffffff', // 次要按钮白色
      warning: '#ff9500',
      danger: '#ff3333',
      normal: '#666666',
      background: '#f5f5f5',
      border: '#3cc51f' // 次要按钮边框绿色
    },
    refreshInterval: 5000 // 数据刷新间隔(ms)
  },

  // 数据异常提醒配置
  alerts: {
    enabled: true, // 是否启用异常提醒
    dataTimeout: 30000, // 数据超时时间(ms) - 30秒无数据视为异常
    connectionTimeout: 10000, // 连接超时时间(ms) - 10秒连接失败视为异常
    showToast: true, // 是否显示Toast提醒
    vibrate: true, // 是否震动提醒
    sound: false // 是否声音提醒(小程序限制)
  },

  // 历史对话配置
  historyConversation: {
    maxCount: 50, // 最大保存对话数量
    maxMessagesPerConv: 100, // 每个对话最大消息数量
    storageKey: 'ai_doctor_conversations', // 本地存储键名
    autoSaveEnabled: true, // 是否启用自动保存
    titleMaxLength: 20 // 对话标题最大长度
  }
};

module.exports = config;
