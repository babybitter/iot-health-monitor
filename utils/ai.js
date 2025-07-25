// AI助手
const config = require("../config/config.js");
const MarkdownRenderer = require("./markdown.js");

class AIAssistant {
  constructor() {
    this.apiKey = config.ai.apiKey;
    this.baseUrl = config.ai.baseUrl;
    this.botId = config.ai.botId;
    this.userId = config.ai.userId;
  }

  // 获取API Key
  getApiKey() {
    if (!this.apiKey) {
      this.apiKey = wx.getStorageSync("coze_api_key") || config.ai.apiKey;
    }
    return this.apiKey;
  }

  // 生成会话ID
  generateConversationId() {
    // 从本地存储获取或生成新的会话ID
    let conversationId = wx.getStorageSync("coze_conversation_id");
    if (!conversationId) {
      conversationId =
        "conv_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substring(2, 11);
      wx.setStorageSync("coze_conversation_id", conversationId);
    }
    return conversationId;
  }

  // 系统提示词
  buildSystemPrompt() {
    return `你是一位专业的AI智能医生，具备医学常识、诊断能力和数据分析能力。用户会提供以下信息：

- 人体健康数据（如呼吸，心跳，血氧等）
- 环境数据（如光照，气压，温度，湿度等）
- 用户主诉（如不适症状、饮食作息、精神状态等）

你的任务是根据以上信息，判断可能的健康风险、给出初步分析和建议。输出格式如下：

1. **初步诊断：** 对当前健康状态的简要评估
2. **关联分析：** 人体数据和环境因素之间的关系分析
3. **健康建议：** 生活方式调整建议，或是否需要就医
4. **风险预警：** 如有潜在健康问题，请突出提示

请严格按照以上格式回复，确保专业性和准确性。`;
  }

  // 发送消息到AI（修复版）
  async sendMessageStream(message, monitorData = null, onProgress = null) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("请先配置Coze API Key");
    }

    // 构建完整的用户消息，包含系统提示词和监测数据
    let fullMessage = this.buildSystemPrompt() + "\n\n" + message;

    // 如果有监测数据，添加到消息中
    if (monitorData) {
      const monitorInfo = `\n\n当前患者监测数据：
【人体健康数据】
- 呼吸频率: ${monitorData.breathing?.value || "--"}次/分 (状态: ${monitorData.breathing?.status || "未知"})
- 心率: ${monitorData.heartRate?.value || "--"}次/分 (状态: ${monitorData.heartRate?.status || "未知"})
- 血氧饱和度: ${monitorData.bloodOxygen?.value || "--"}% (状态: ${monitorData.bloodOxygen?.status || "未知"})

【环境监测数据】
- 环境温度: ${monitorData.temperature?.value || "--"}°C (状态: ${monitorData.temperature?.status || "未知"})
- 环境湿度: ${monitorData.humidity?.value || "--"}% (状态: ${monitorData.humidity?.status || "未知"})
- 光照强度: ${monitorData.light?.value || "--"}lux (状态: ${monitorData.light?.status || "未知"})
- 气压: ${monitorData.pressure?.value || "--"}hPa (状态: ${monitorData.pressure?.status || "未知"})

【设备状态】
- LED状态: ${monitorData.led?.status || "--"}
- 蜂鸣器状态: ${monitorData.buzzer?.status || "--"}`;

      fullMessage += monitorInfo;
    }

    // 根据官方文档配置Coze API请求
    const requestData = {
      conversation_id: this.generateConversationId(),
      bot_id: this.botId,
      user: this.userId,
      query: fullMessage,
      stream: false, // Coze API不支持真正的流式输出
    };

    return new Promise((resolve, reject) => {
      wx.request({
        url: this.baseUrl,
        method: "POST",
        header: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        data: requestData,
        timeout: 30000, // 30秒超时
        success: (res) => {
          // 修复响应处理逻辑
          if (res.statusCode === 200) {
            // 检查响应数据结构
            if (!res.data) {
              reject(new Error("API响应数据为空"));
              return;
            }

            // 检查是否有错误代码
            if (res.data.code !== undefined && res.data.code !== 0) {
              reject(new Error(res.data.msg || "API调用失败"));
              return;
            }

            // 处理响应消息
            const messages = res.data.messages || [];
            // 优化消息解析逻辑
            let reply = this.parseAIResponse(messages);

            if (!reply) {
              reply = "抱歉，我暂时无法回答您的问题，请稍后再试。";
            }

            // 渲染Markdown
            const rendered = MarkdownRenderer.renderForWeapp(reply);

            // 使用优化的流式输出效果
            this.simulateStreamOutput(rendered.text, onProgress).then(() => {
              resolve(rendered.text);
            });
          } else {
            reject(new Error(`HTTP错误: ${res.statusCode}`));
          }
        },
        fail: (error) => {
          reject(new Error("网络连接失败"));
        },
      });
    });
  }

  // 解析AI响应的优化方法
  parseAIResponse(messages) {
    if (!messages || messages.length === 0) return null;

    // 优先级解析策略
    const strategies = [
      // 策略1: assistant + answer类型
      () =>
        messages.find(
          (msg) => msg.role === "assistant" && msg.type === "answer"
        ),
      // 策略2: assistant类型
      () => messages.find((msg) => msg.role === "assistant"),
      // 策略3: 最后一条有内容的消息
      () => messages.reverse().find((msg) => msg.content && msg.content.trim()),
      // 策略4: 任何有内容的消息
      () => messages.find((msg) => msg.content && msg.content.trim()),
    ];

    for (const strategy of strategies) {
      const message = strategy();
      if (message && message.content) {
        return message.content;
      }
    }

    return null;
  }

  // 优化的流式输出效果
  async optimizedStreamOutput(fullText, onProgress, responseTime = 1000) {
    if (!onProgress || typeof onProgress !== "function") {
      return Promise.resolve();
    }

    // 根据响应时间动态调整显示速度
    const baseDelay = Math.max(8, Math.min(25, responseTime / 100)); // 8-25ms之间

    // 智能分词，按词组而非单字符显示
    const segments = this.smartSegmentation(fullText);
    let currentText = "";

    for (let i = 0; i < segments.length; i++) {
      currentText += segments[i];
      const isComplete = i === segments.length - 1;

      onProgress(currentText, isComplete);

      // 动态延迟：短响应时间=快速显示，长响应时间=慢速显示
      if (!isComplete) {
        await new Promise((resolve) => setTimeout(resolve, baseDelay));
      }
    }
  }

  // 智能分词方法
  smartSegmentation(text) {
    if (!text) return [""];

    // 按标点符号、空格、换行符等自然断点分割
    const segments = [];
    let currentSegment = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      currentSegment += char;

      // 在标点符号、空格、换行符后分割，或者达到1-2个字符就分割（更快显示）
      if (char.match(/[。！？，、；：\s\n]/) || currentSegment.length >= 2) {
        segments.push(currentSegment);
        currentSegment = "";
      }
    }

    // 添加剩余字符
    if (currentSegment) {
      segments.push(currentSegment);
    }

    return segments.length > 0 ? segments : [text];
  }

  // 快速流式输出模拟（优化版）
  async simulateStreamOutput(fullText, onProgress) {
    // 使用更快的响应时间参数，减少等待感
    return this.optimizedStreamOutput(fullText, onProgress, 300);
  }

  // 发送消息到AI（兼容旧版本）
  async sendMessage(message, monitorData = null) {
    return new Promise((resolve, reject) => {
      this.sendMessageStream(message, monitorData, null)
        .then(resolve)
        .catch(reject);
    });
  }

  // 分析监测数据
  async analyzeMonitorData(monitorData) {
    const message = `请分析我当前的健康监测数据和环境数据，评估环境因素对我健康的影响，给出专业的健康评估和环境调节建议。`;
    return await this.sendMessage(message, monitorData);
  }

  // 健康咨询
  async healthConsult(question, monitorData = null) {
    return await this.sendMessage(question, monitorData);
  }
}

// 创建单例
const aiAssistant = new AIAssistant();

module.exports = aiAssistant;
