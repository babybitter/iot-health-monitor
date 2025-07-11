// 个人中心页面
const app = getApp();

Page({
  data: {
    // 导航栏相关
    statusBarHeight: 0, // 状态栏高度
    navHeight: 0, // 导航栏总高度

    login: {
      show: false,
      line: false,
      avatar: "/images/default-avatar.png",
    },
    patientInfo: {
      id: "MED000156",
      lastLoginTime: "",
    },
  },

  // 格式化时间为 YYYY.MM.DD HH.SS 格式
  formatTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}.${month}.${day} ${hour}.${minute}`;
  },

  // 更新登录时间
  updateLastLoginTime() {
    const currentTime = new Date();
    const formattedTime = this.formatTime(currentTime);
    this.setData({
      "patientInfo.lastLoginTime": formattedTime,
    });
    // 保存到本地存储
    wx.setStorageSync("lastLoginTime", formattedTime);
  },

  // 登录监听
  chooseAvatar(e) {
    // 更新登录时间
    this.updateLastLoginTime();

    this.setData({
      login: {
        show: true,
        line: true,
        avatar: e.detail.avatarUrl,
      },
    });

    // 保存用户信息到本地存储
    wx.setStorageSync("userInfo", {
      avatarUrl: e.detail.avatarUrl,
      loginTime: new Date().getTime(),
    });

    // 显示欢迎使用弹窗
    wx.showToast({
      title: "欢迎使用",
      icon: "success",
      duration: 2000,
    });
  },

  // 基本信息
  basicClick() {
    wx.navigateTo({
      url: "/pages/patient-info/patient-info",
    });
  },

  // 关于我们
  aboutClick() {
    wx.showToast({
      title: "功能开发中",
      icon: "none",
    });
  },

  // 跳转到主治医生信息页面
  goToHistory() {
    wx.navigateTo({
      url: "/pages/doctor-info/doctor-info", // 跳转到主治医生信息页面
    });
  },

  // 跳转到家属联系方式页面
  goToFamilyContact() {
    wx.navigateTo({
      url: "/pages/family-contact/family-contact", // 跳转到家属联系方式页面
    });
  },

  // 退出监听
  exitClick() {
    let that = this;
    wx.showModal({
      title: "提示",
      content: "确定退出登录吗？",
      success(res) {
        if (res.confirm) {
          that.setData({
            login: {
              show: false,
              line: false,
              avatar: "/images/default-avatar.png",
            },
            "patientInfo.lastLoginTime": "暂无记录",
          });
          // 清除本地存储的用户信息
          wx.removeStorageSync("userInfo");
          wx.removeStorageSync("lastLoginTime");
          wx.showToast({
            title: "已退出登录",
            icon: "success",
          });
        }
      },
    });
  },

  onLoad(options) {
    this.initNavBar(); // 初始化导航栏

    // 页面加载时检查登录状态
    const userInfo = wx.getStorageSync("userInfo");
    const lastLoginTime = wx.getStorageSync("lastLoginTime");

    if (userInfo && userInfo.avatarUrl) {
      this.setData({
        login: {
          show: true,
          line: true,
          avatar: userInfo.avatarUrl,
        },
        "patientInfo.lastLoginTime": lastLoginTime || "暂无记录",
      });
    } else {
      // 如果未登录，设置默认的登录时间显示
      this.setData({
        "patientInfo.lastLoginTime": "暂无记录",
      });
    }
  },

  onReady() {},

  onShow() {},

  onHide() {},

  onUnload() {},

  onPullDownRefresh() {},

  onReachBottom() {},

  onShareAppMessage() {
    return {
      title: "患者健康监测小程序",
      path: "/pages/index/index",
    };
  },

  // 头像加载错误处理
  onImageError(e) {
    // 头像加载失败处理
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
