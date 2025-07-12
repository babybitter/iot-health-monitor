// AI助手智能医生页面
const aiAssistant = require("../../utils/ai.js");
const config = require("../../config/config.js");

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
    sidderVisible: false, // 侧边栏是否显示
    conversations: [], // 历史对话列表
    currentConvId: "", // 当前对话ID
    navHeight: 0, // 导航栏高度
    statusBarHeight: 0, // 状态栏高度
    showNewConvDropdown: false, // 新建对话下拉框是否显示
    // 编辑模式相关
    isEditMode: false, // 是否处于编辑模式
    showClearAllDialog: false, // 显示清空全部对话确认框
    showDeleteDialog: false, // 显示删除单个对话确认框
    showRenameDialog: false, // 显示重命名对话框
    selectedConvId: "", // 选中的对话ID
    selectedConvTitle: "", // 选中的对话标题
    renameValue: "", // 重命名输入值
    showSuccessToast: false, // 显示成功提示
    successMessage: "", // 成功提示消息
  },

  onLoad() {
    this.initCustomNavbar(); // 初始化自定义导航栏
    this.loadMonitorData();
    this.addWelcomeMessage();
    this.loadConversations(); // 加载历史对话
  },

  onShow() {
    this.loadMonitorData();
    // 🔥 启动数据刷新定时器
    this.startDataRefresh();
  },

  onHide() {
    // 页面隐藏时清理定时器和保存对话
    this.stopThinkingLoop();
    this.stopDataRefresh(); // 🔥 停止数据刷新
    // 自动保存当前对话
    if (this.data.messages.length > 1) {
      this.saveCurrentConversation();
    }
  },

  onUnload() {
    // 页面卸载时清理定时器和保存对话
    this.stopThinkingLoop();
    this.stopDataRefresh(); // 🔥 停止数据刷新
    // 自动保存当前对话
    if (this.data.messages.length > 1) {
      this.saveCurrentConversation();
    }
  },

  // 加载监测数据
  loadMonitorData() {
    const app = getApp();

    // 🔥 优先从全局数据获取最新数据
    if (app.globalData && app.globalData.monitorData) {
      console.log("AI助手页面加载全局数据:", app.globalData.monitorData);
      this.setData({
        monitorData: app.globalData.monitorData,
      });
    } else {
      // 备用方案：从主页获取数据
      const pages = getCurrentPages();
      const indexPage = pages.find(
        (page) => page.route === "pages/index/index"
      );
      if (indexPage && indexPage.data.monitorData) {
        console.log("AI助手页面从主页获取数据:", indexPage.data.monitorData);
        this.setData({
          monitorData: indexPage.data.monitorData,
        });

        // 同时更新全局数据
        if (app.globalData) {
          app.globalData.monitorData = indexPage.data.monitorData;
        }
      }
    }

    // 🔥 添加调试信息
    console.log("AI助手页面当前数据:", this.data.monitorData);
  },

  // 🔥 启动数据刷新定时器
  startDataRefresh() {
    // 每5秒刷新一次数据
    this.dataRefreshTimer = setInterval(() => {
      this.loadMonitorData();
    }, 5000);
  },

  // 🔥 停止数据刷新定时器
  stopDataRefresh() {
    if (this.dataRefreshTimer) {
      clearInterval(this.dataRefreshTimer);
      this.dataRefreshTimer = null;
    }
  },

  // 添加欢迎消息
  addWelcomeMessage() {
    const welcomeMsg = {
      role: "assistant",
      content:
        "您好！我是您的AI智能医生。我可以帮您分析健康监测数据和环境因素，提供专业的医学建议，请问有什么可以帮助您的吗？",
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

        // 自动保存当前对话
        this.saveCurrentConversation();
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
      actualMessage = "请分析我当前的健康监测数据和环境数据，评估环境因素对我健康的影响，给出专业的健康评估和环境调节建议。";
    } else if (message.includes("给我一些健康建议")) {
      actualMessage = "根据我的健康监测数据和环境数据，请给我一些日常健康建议、环境调节建议和注意事项。";
    } else if (message.includes("我的数据正常吗")) {
      actualMessage =
        "我的各项健康监测数据和环境数据是否在正常范围内？环境对我的健康有什么影响？有什么需要注意的吗？";
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

        // 自动保存当前对话
        this.saveCurrentConversation();
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
      "请分析我当前的健康监测数据和环境数据，评估环境因素对我健康的影响，给出专业的健康评估和环境调节建议。";

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
    const question = "根据我的健康监测数据和环境数据，请给我一些日常健康建议、环境调节建议和注意事项。";

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

  // 侧边栏切换
  handleSidderToggle() {
    this.setData({
      sidderVisible: !this.data.sidderVisible,
    });
  },

  // 关闭侧边栏
  handleSidderClose() {
    this.setData({
      sidderVisible: false,
    });
  },

  // 加载历史对话列表
  loadConversations() {
    try {
      const conversations =
        wx.getStorageSync(config.historyConversation.storageKey) || [];
      this.setData({
        conversations: this.groupConversationsByDate(conversations),
      });
    } catch (error) {
      console.error("加载历史对话失败:", error);
      this.setData({
        conversations: [],
      });
    }
  },

  // 保存当前对话
  saveCurrentConversation() {
    if (!config.historyConversation.autoSaveEnabled) return;
    if (this.data.messages.length <= 1) return; // 只有欢迎消息时不保存

    try {
      const conversations =
        wx.getStorageSync(config.historyConversation.storageKey) || [];
      const currentTime = Date.now();

      // 查找是否已存在当前对话
      const existingIndex = this.data.currentConvId
        ? conversations.findIndex((conv) => conv.id === this.data.currentConvId)
        : -1;

      // 生成对话标题
      const title = this.generateConversationTitle();

      // 限制消息数量
      const messages = this.data.messages.slice(
        -config.historyConversation.maxMessagesPerConv
      );

      // 创建对话对象
      const conversation = {
        id: this.data.currentConvId || "conv_" + currentTime,
        title: title,
        lastMessage: this.getLastUserMessage(),
        createTime: this.data.currentConvId
          ? conversations[existingIndex]?.createTime || currentTime
          : currentTime,
        lastUpdateTime: currentTime,
        messages: messages,
      };

      // 更新或添加对话
      if (existingIndex >= 0) {
        conversations[existingIndex] = conversation;
      } else {
        // 限制对话数量
        if (conversations.length >= config.historyConversation.maxCount) {
          conversations.pop(); // 删除最旧的对话
        }
        conversations.unshift(conversation); // 添加到开头

        // 更新当前对话ID
        this.setData({
          currentConvId: conversation.id,
        });
      }

      // 保存到本地存储
      wx.setStorageSync(config.historyConversation.storageKey, conversations);

      // 更新页面数据
      this.setData({
        conversations: this.groupConversationsByDate(conversations),
      });
    } catch (error) {
      console.error("保存对话失败:", error);
    }
  },

  // 按日期分组对话
  groupConversationsByDate(conversations) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = [
      { period: "置顶", list: [] },
      { period: "今天", list: [] },
      { period: "昨天", list: [] },
      { period: "更早", list: [] },
    ];

    conversations.forEach((conv) => {
      const convDate = new Date(conv.lastUpdateTime);
      convDate.setHours(0, 0, 0, 0);

      // 添加格式化的时间显示
      const formattedConv = {
        ...conv,
        lastUpdateTime: this.formatTime(conv.lastUpdateTime),
      };

      // 如果是置顶对话，放在置顶分组
      if (conv.isPinned) {
        groups[0].list.push(formattedConv);
      } else if (convDate.getTime() === today.getTime()) {
        groups[1].list.push(formattedConv);
      } else if (convDate.getTime() === yesterday.getTime()) {
        groups[2].list.push(formattedConv);
      } else {
        groups[3].list.push(formattedConv);
      }
    });

    // 过滤掉空组
    return groups.filter((group) => group.list.length > 0);
  },

  // 生成对话标题
  generateConversationTitle() {
    // 从第一条用户消息提取标题
    const firstUserMsg = this.data.messages.find((msg) => msg.role === "user");
    if (firstUserMsg && firstUserMsg.content) {
      const content = firstUserMsg.content.trim();
      if (content.length > config.historyConversation.titleMaxLength) {
        return (
          content.substring(0, config.historyConversation.titleMaxLength) +
          "..."
        );
      }
      return content;
    }
    return "新对话";
  },

  // 获取最后一条用户消息
  getLastUserMessage() {
    const userMessages = this.data.messages.filter(
      (msg) => msg.role === "user"
    );
    if (userMessages.length > 0) {
      const lastMsg = userMessages[userMessages.length - 1];
      const content = lastMsg.content.trim();
      return content.length > 30 ? content.substring(0, 30) + "..." : content;
    }
    return "";
  },

  // 格式化时间显示
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const targetDate = new Date(timestamp);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate.getTime() === today.getTime()) {
      // 今天显示时间
      return (
        date.getHours().toString().padStart(2, "0") +
        ":" +
        date.getMinutes().toString().padStart(2, "0")
      );
    } else if (targetDate.getTime() === yesterday.getTime()) {
      // 昨天显示"昨天"
      return "昨天";
    } else {
      // 更早显示月日
      return date.getMonth() + 1 + "/" + date.getDate();
    }
  },

  // 加载指定对话
  loadConversation(e) {
    const convId = e.currentTarget.dataset.id;
    if (!convId) return;

    try {
      const conversations =
        wx.getStorageSync(config.historyConversation.storageKey) || [];
      const conversation = conversations.find((conv) => conv.id === convId);

      if (conversation) {
        // 保存当前对话（如果有内容）
        if (this.data.messages.length > 1) {
          this.saveCurrentConversation();
        }

        // 加载选中的对话
        this.setData({
          messages: conversation.messages,
          currentConvId: conversation.id,
          sidderVisible: false, // 关闭侧边栏
        });

        // 滚动到底部
        this.scrollToBottom();

        wx.showToast({
          title: "对话已加载",
          icon: "success",
          duration: 1500,
        });
      }
    } catch (error) {
      console.error("加载对话失败:", error);
      wx.showToast({
        title: "加载失败",
        icon: "error",
        duration: 2000,
      });
    }
  },

  // 新建对话
  startNewConv() {
    // 检查当前对话是否有内容（除了欢迎消息）
    const hasContent = this.data.messages.length > 1;

    if (hasContent) {
      // 如果有内容，显示确认对话框
      wx.showModal({
        title: "新建对话",
        content: "当前对话将被保存，确定要开始新对话吗？",
        confirmText: "确定",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            this.createNewConversation();
          }
        },
      });
    } else {
      // 如果没有内容，直接创建新对话
      this.createNewConversation();
    }
  },

  // 创建新对话的具体实现
  createNewConversation() {
    try {
      // 保存当前对话（如果有内容）
      if (this.data.messages.length > 1) {
        this.saveCurrentConversation();
      }

      // 清空当前对话状态
      this.setData({
        messages: [],
        currentConvId: "",
        sidderVisible: false, // 关闭侧边栏
        inputText: "", // 清空输入框
        isLoading: false, // 重置加载状态
        streamingMessageId: null, // 重置流式输出状态
        thinkingStatus: "", // 重置思考状态
      });

      // 停止任何正在进行的思考循环
      this.stopThinkingLoop();

      // 添加欢迎消息
      this.addWelcomeMessage();

      // 滚动到底部
      this.scrollToBottom();

      // 显示成功提示
      wx.showToast({
        title: "新对话已创建",
        icon: "success",
        duration: 1500,
      });
    } catch (error) {
      console.error("创建新对话失败:", error);
      wx.showToast({
        title: "创建失败",
        icon: "error",
        duration: 2000,
      });
    }
  },

  // 初始化自定义导航栏
  initCustomNavbar() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();

      // 计算状态栏高度
      const statusBarHeight = systemInfo.statusBarHeight;

      // 计算导航栏高度：状态栏高度 + 胶囊按钮高度 + 胶囊按钮上下边距
      const navHeight =
        statusBarHeight +
        menuButtonInfo.height +
        (menuButtonInfo.top - statusBarHeight) * 2;

      this.setData({
        statusBarHeight: statusBarHeight,
        navHeight: navHeight,
      });
    } catch (error) {
      console.error("初始化自定义导航栏失败:", error);
      // 设置默认值
      this.setData({
        statusBarHeight: 44,
        navHeight: 88,
      });
    }
  },

  // 切换新建对话下拉框
  toggleNewConvDropdown() {
    this.setData({
      showNewConvDropdown: !this.data.showNewConvDropdown,
    });
  },

  // 关闭新建对话下拉框
  closeNewConvDropdown() {
    this.setData({
      showNewConvDropdown: false,
    });
  },

  // 重写startNewConv方法，添加关闭下拉框逻辑
  startNewConv() {
    // 关闭下拉框
    this.setData({
      showNewConvDropdown: false,
    });

    // 检查当前对话是否有内容（除了欢迎消息）
    const hasContent = this.data.messages.length > 1;

    if (hasContent) {
      // 如果有内容，显示确认对话框
      wx.showModal({
        title: "新建对话",
        content: "当前对话将被保存，确定要开始新对话吗？",
        confirmText: "确定",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            this.createNewConversation();
          }
        },
      });
    } else {
      // 如果没有内容，直接创建新对话
      this.createNewConversation();
    }
  },

  // ==================== 编辑模式相关方法 ====================

  // 切换编辑模式
  toggleEditMode() {
    this.setData({
      isEditMode: !this.data.isEditMode,
      showClearAllDialog: false,
      showDeleteDialog: false,
      showRenameDialog: false,
    });
  },

  // 显示清空全部对话确认框
  showClearAllDialog() {
    this.setData({
      showClearAllDialog: true,
    });
  },

  // 隐藏清空全部对话确认框
  hideClearAllDialog() {
    this.setData({
      showClearAllDialog: false,
    });
  },

  // 清空全部对话
  clearAllConversations() {
    try {
      // 清空本地存储
      wx.removeStorageSync(config.historyConversation.storageKey);

      // 更新页面数据
      this.setData({
        conversations: [],
        showClearAllDialog: false,
        isEditMode: false,
      });

      // 如果当前有对话，也清空当前对话
      if (this.data.currentConvId) {
        this.setData({
          messages: [],
          currentConvId: "",
        });
        this.addWelcomeMessage();
      }

      this.showSuccessMessage("清空成功");
    } catch (error) {
      console.error("清空对话失败:", error);
      wx.showToast({
        title: "清空失败",
        icon: "error",
        duration: 2000,
      });
    }
  },

  // 显示删除单个对话确认框
  showDeleteDialog(e) {
    const { id, title } = e.currentTarget.dataset;
    this.setData({
      showDeleteDialog: true,
      selectedConvId: id,
      selectedConvTitle: title,
    });
  },

  // 隐藏删除单个对话确认框
  hideDeleteDialog() {
    this.setData({
      showDeleteDialog: false,
      selectedConvId: "",
      selectedConvTitle: "",
    });
  },

  // 删除单个对话
  deleteConversation() {
    try {
      const conversations = wx.getStorageSync(config.historyConversation.storageKey) || [];
      const filteredConversations = conversations.filter(conv => conv.id !== this.data.selectedConvId);

      // 保存更新后的对话列表
      wx.setStorageSync(config.historyConversation.storageKey, filteredConversations);

      // 更新页面数据
      this.setData({
        conversations: this.groupConversationsByDate(filteredConversations),
        showDeleteDialog: false,
        selectedConvId: "",
        selectedConvTitle: "",
      });

      // 如果删除的是当前对话，清空当前对话
      if (this.data.currentConvId === this.data.selectedConvId) {
        this.setData({
          messages: [],
          currentConvId: "",
        });
        this.addWelcomeMessage();
      }

      this.showSuccessMessage("删除成功");
    } catch (error) {
      console.error("删除对话失败:", error);
      wx.showToast({
        title: "删除失败",
        icon: "error",
        duration: 2000,
      });
    }
  },

  // 显示重命名对话框
  showRenameDialog(e) {
    const { id, title } = e.currentTarget.dataset;
    this.setData({
      showRenameDialog: true,
      selectedConvId: id,
      selectedConvTitle: title,
      renameValue: title,
    });
  },

  // 隐藏重命名对话框
  hideRenameDialog() {
    this.setData({
      showRenameDialog: false,
      selectedConvId: "",
      selectedConvTitle: "",
      renameValue: "",
    });
  },

  // 重命名输入事件
  onRenameInput(e) {
    this.setData({
      renameValue: e.detail.value,
    });
  },

  // 清空重命名输入
  clearRenameInput() {
    this.setData({
      renameValue: "",
    });
  },

  // 确认重命名
  confirmRename() {
    const newTitle = this.data.renameValue.trim();
    console.log('重命名操作:', { newTitle, selectedConvId: this.data.selectedConvId });

    if (!newTitle) {
      wx.showToast({
        title: "请输入对话名称",
        icon: "none",
        duration: 2000,
      });
      return;
    }

    try {
      const conversations = wx.getStorageSync(config.historyConversation.storageKey) || [];
      console.log('当前对话列表:', conversations);

      const updatedConversations = conversations.map(conv => {
        if (conv.id === this.data.selectedConvId) {
          console.log('找到要重命名的对话:', conv);
          return { ...conv, title: newTitle };
        }
        return conv;
      });

      console.log('更新后的对话列表:', updatedConversations);

      // 保存更新后的对话列表
      wx.setStorageSync(config.historyConversation.storageKey, updatedConversations);

      // 更新页面数据
      this.setData({
        conversations: this.groupConversationsByDate(updatedConversations),
        showRenameDialog: false,
        selectedConvId: "",
        selectedConvTitle: "",
        renameValue: "",
      });

      this.showSuccessMessage("重命名成功");
    } catch (error) {
      console.error("重命名对话失败:", error);
      wx.showToast({
        title: "重命名失败",
        icon: "error",
        duration: 2000,
      });
    }
  },

  // 置顶对话
  pinConversation(e) {
    const convId = e.currentTarget.dataset.id;
    try {
      const conversations = wx.getStorageSync(config.historyConversation.storageKey) || [];
      const updatedConversations = conversations.map(conv => {
        if (conv.id === convId) {
          return { ...conv, isPinned: !conv.isPinned };
        }
        return conv;
      });

      // 保存更新后的对话列表
      wx.setStorageSync(config.historyConversation.storageKey, updatedConversations);

      // 更新页面数据
      this.setData({
        conversations: this.groupConversationsByDate(updatedConversations),
      });

      const targetConv = updatedConversations.find(conv => conv.id === convId);
      this.showSuccessMessage(targetConv.isPinned ? "置顶成功" : "取消置顶");
    } catch (error) {
      console.error("置顶对话失败:", error);
      wx.showToast({
        title: "置顶失败",
        icon: "error",
        duration: 2000,
      });
    }
  },

  // 显示成功消息
  showSuccessMessage(message) {
    this.setData({
      showSuccessToast: true,
      successMessage: message,
    });

    setTimeout(() => {
      this.setData({
        showSuccessToast: false,
        successMessage: "",
      });
    }, 2000);
  },
});
