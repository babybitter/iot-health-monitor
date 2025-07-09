// AI助手智能医生页面
const aiAssistant = require("../../utils/ai.js");

Page({
  data: {
    messages: [], // 聊天消息列表
    inputText: "", // 输入框文本
    isLoading: false, // 是否正在加载
    scrollIntoView: "", // 滚动位置
    monitorData: {}, // 监测数据
    streamingMessageId: null, // 当前流式输出的消息ID
    thinkingStatus: "", // 思考状态: 'thinking', 'organizing', ''
    thinkingTimer: null, // 思考状态循环定时器
  },

  onLoad() {
    this.loadMonitorData();
    this.addWelcomeMessage();
  },

  onShow() {
    this.loadMonitorData();
  },

  onHide() {
    // 页面隐藏时清理定时器
    this.stopThinkingLoop();
  },

  onUnload() {
    // 页面卸载时清理定时器
    this.stopThinkingLoop();
  },



  // 加载监测数据
  loadMonitorData() {
    const app = getApp();
    if (app.globalData && app.globalData.monitorData) {
      this.setData({
        monitorData: app.globalData.monitorData,
      });
    } else {
      // 从其他页面获取数据
      const pages = getCurrentPages();
      const indexPage = pages.find(
        (page) => page.route === "pages/index/index"
      );
      if (indexPage && indexPage.data.monitorData) {
        this.setData({
          monitorData: indexPage.data.monitorData,
        });
      }
    }
  },

  // 添加欢迎消息
  addWelcomeMessage() {
    const welcomeMsg = {
      role: "assistant",
      content:
        "您好！我是您的AI健康助手。我可以帮您分析健康监测数据，回答健康相关问题，并提供专业建议。请问有什么可以帮助您的吗？",
      time: this.getCurrentTime(),
    };

    this.setData({
      messages: [welcomeMsg],
    });
  },



  // 输入框变化
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value,
    });
  },

  // 发送消息（支持流式输出）
  sendMessage() {
    const text = this.data.inputText.trim();
    if (!text || this.data.isLoading) return;

    // 添加用户消息
    const userMessage = {
      role: "user",
      content: text,
      time: this.getCurrentTime(),
      id: Date.now() + "_user",
    };

    this.setData({
      messages: this.data.messages.concat([userMessage]),
      inputText: "",
      isLoading: true,
      thinkingStatus: "thinking", // 开始思考状态
    });

    this.scrollToBottom();

    // 开始思考状态循环
    this.startThinkingLoop();

    // 创建AI消息占位符（但不显示）
    const aiMessageId = Date.now() + "_ai";
    const aiMessage = {
      role: "assistant",
      content: "",
      time: this.getCurrentTime(),
      id: aiMessageId,
      isStreaming: true,
    };

    // 调用AI接口（流式输出）
    aiAssistant
      .sendMessageStream(
        text,
        this.data.monitorData,
        (partialContent, isComplete) => {
          // 第一次收到内容时，停止思考循环并显示AI消息
          if (
            partialContent &&
            partialContent.length > 0 &&
            this.data.thinkingStatus
          ) {
            this.stopThinkingLoop();
            this.setData({
              messages: this.data.messages.concat([aiMessage]),
              streamingMessageId: aiMessageId,
              thinkingStatus: "",
            });
            this.scrollToBottom();
          }

          // 更新流式输出内容
          this.updateStreamingMessage(aiMessageId, partialContent, isComplete);
        }
      )
      .then((finalContent) => {
        // 流式输出完成，确保显示最终内容
        this.updateStreamingMessage(aiMessageId, finalContent, true);

        this.setData({
          isLoading: false,
          streamingMessageId: null,
        });
        this.scrollToBottom();
      })
      .catch((error) => {
        // 停止思考循环
        this.stopThinkingLoop();

        // 更新错误消息
        this.updateStreamingMessage(
          aiMessageId,
          `抱歉，发生了错误：${error.message}。请检查网络连接或API配置。`,
          true
        );

        this.setData({
          isLoading: false,
          streamingMessageId: null,
          thinkingStatus: "",
          messages: this.data.messages.concat([aiMessage]),
        });

        this.scrollToBottom();
      });
  },

  // 开始思考状态循环
  startThinkingLoop() {
    let isThinking = true; // true: 思考中, false: 梳理中

    const toggleThinking = () => {
      if (this.data.thinkingStatus === "") {
        // 如果思考状态已被清除，停止循环
        return;
      }

      this.setData({
        thinkingStatus: isThinking ? "thinking" : "organizing",
      });

      isThinking = !isThinking; // 切换状态

      // 设置下一次切换（每1.5秒切换一次）
      this.data.thinkingTimer = setTimeout(toggleThinking, 1500);
    };

    // 立即开始第一次切换
    toggleThinking();
  },

  // 停止思考状态循环
  stopThinkingLoop() {
    if (this.data.thinkingTimer) {
      clearTimeout(this.data.thinkingTimer);
      this.setData({
        thinkingTimer: null,
        thinkingStatus: "",
      });
    }
  },

  // 发送预制消息
  sendPresetMessage(e) {
    const message = e.currentTarget.dataset.message;
    if (!message) return;

    // 根据预制消息设置对应的实际问题
    let actualMessage = "";
    if (message.includes("分析我的健康数据")) {
      actualMessage = "请分析我当前的健康监测数据，给出专业的健康评估和建议。";
    } else if (message.includes("给我一些健康建议")) {
      actualMessage = "根据我的监测数据，请给我一些日常健康建议和注意事项。";
    } else if (message.includes("我的数据正常吗")) {
      actualMessage =
        "我的各项健康监测数据是否在正常范围内？有什么需要注意的吗？";
    } else {
      actualMessage = message;
    }

    this.setData({
      inputText: actualMessage,
    });

    // 直接发送消息
    this.sendMessage();
  },

  // 更新流式输出消息
  updateStreamingMessage(messageId, content, isComplete) {
    const messages = this.data.messages.map((msg) => {
      if (msg.id === messageId) {
        return {
          ...msg,
          content: content,
          isStreaming: !isComplete,
        };
      }
      return msg;
    });

    this.setData({ messages });

    // 自动滚动到底部
    if (content.length % 30 === 0 || isComplete) {
      this.scrollToBottom();
    }
  },

  // 备用发送方法（非流式）
  sendMessageFallback(text) {
    const aiMessageId = Date.now() + "_ai_fallback";
    const aiMessage = {
      role: "assistant",
      content: "",
      time: this.getCurrentTime(),
      id: aiMessageId,
      isStreaming: false,
    };

    this.setData({
      messages: this.data.messages.concat([aiMessage]),
      isLoading: true,
    });

    // 使用传统方式发送消息
    aiAssistant
      .sendMessage(text, this.data.monitorData)
      .then((reply) => {
        this.updateStreamingMessage(aiMessageId, reply, true);
        this.setData({
          isLoading: false,
        });
        this.scrollToBottom();
      })
      .catch((error) => {
        this.updateStreamingMessage(
          aiMessageId,
          `抱歉，发生了错误：${error.message}`,
          true
        );
        this.setData({
          isLoading: false,
        });
      });
  },

  // 分析监测数据
  analyzeData() {
    if (
      !this.data.monitorData ||
      Object.keys(this.data.monitorData).length === 0
    ) {
      wx.showToast({ title: "暂无监测数据", icon: "error" });
      return;
    }

    // 创建AI消息占位符
    const aiMessageId = Date.now() + "_ai";
    const aiMessage = {
      role: "assistant",
      content: "",
      time: this.getCurrentTime(),
      id: aiMessageId,
      isStreaming: true,
    };

    this.setData({
      messages: this.data.messages.concat([aiMessage]),
      isLoading: true,
      streamingMessageId: aiMessageId,
    });

    this.scrollToBottom();

    const analysisPrompt =
      "请分析我当前的健康监测数据，给出专业的健康评估和建议。";

    aiAssistant
      .sendMessageStream(
        analysisPrompt,
        this.data.monitorData,
        (partialContent, isComplete) => {
          this.updateStreamingMessage(aiMessageId, partialContent, isComplete);
        }
      )
      .then(() => {
        this.setData({
          isLoading: false,
          streamingMessageId: null,
        });
        this.scrollToBottom();
      })
      .catch((error) => {
        this.updateStreamingMessage(
          aiMessageId,
          `抱歉，数据分析失败：${error.message}`,
          true
        );
        this.setData({
          isLoading: false,
          streamingMessageId: null,
        });
      });
  },

  // 健康建议
  healthAdvice() {
    const question = "根据我的健康监测数据，请给我一些日常健康建议。";

    const userMessage = {
      role: "user",
      content: question,
      time: this.getCurrentTime(),
      id: Date.now() + "_user",
    };

    // 创建AI消息占位符
    const aiMessageId = Date.now() + "_ai";
    const aiMessage = {
      role: "assistant",
      content: "",
      time: this.getCurrentTime(),
      id: aiMessageId,
      isStreaming: true,
    };

    this.setData({
      messages: this.data.messages.concat([userMessage, aiMessage]),
      isLoading: true,
      streamingMessageId: aiMessageId,
    });

    this.scrollToBottom();

    aiAssistant
      .sendMessageStream(
        question,
        this.data.monitorData,
        (partialContent, isComplete) => {
          this.updateStreamingMessage(aiMessageId, partialContent, isComplete);
        }
      )
      .then(() => {
        this.setData({
          isLoading: false,
          streamingMessageId: null,
        });
        this.scrollToBottom();
      })
      .catch((error) => {
        this.updateStreamingMessage(
          aiMessageId,
          `抱歉，获取健康建议失败：${error.message}`,
          true
        );
        this.setData({
          isLoading: false,
          streamingMessageId: null,
        });
      });
  },

  // 紧急情况
  emergencyHelp() {
    wx.showModal({
      title: "紧急情况",
      content: "如遇紧急情况，请立即拨打急救电话：120\n\n或联系您的主治医生",
      confirmText: "拨打120",
      cancelText: "取消",
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: "120",
          });
        }
      },
    });
  },

  // 滚动到底部
  scrollToBottom() {
    this.setData({
      scrollIntoView: "bottom",
    });
  },

  // 获取当前时间
  getCurrentTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  },

  // 通知主页更新数据
  notifyIndexPageUpdate() {
    const pages = getCurrentPages();
    const indexPage = pages.find((page) => page.route === "pages/index/index");

    if (indexPage && indexPage.refreshMonitorData) {
      // 如果主页有刷新函数，直接调用
      indexPage.refreshMonitorData();
    } else {
      // 如果主页没有刷新函数，尝试更新各个数据项
      const app = getApp();
      const monitorData = app.globalData.monitorData;

      if (indexPage && indexPage.updateMonitorData) {
        // 逐个更新数据项
        Object.keys(monitorData).forEach((type) => {
          if (monitorData[type].value !== "--") {
            indexPage.updateMonitorData(type, monitorData[type]);
          }
        });
      }
    }
  },
});
