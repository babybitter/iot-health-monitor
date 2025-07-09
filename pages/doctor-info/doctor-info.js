// 主治医生信息页面
Page({
  data: {
    doctorData: {
      name: "李明华",
      department: "心脏内科",
      position: "主任医师",
      experience: "15年",
      hospital: "北京协和医院",
      schedule: "周一、周三上午",
      email: "li@hospital.com",
      phone: "010-69156114",
    },
    updateTime: "",
  },

  onLoad() {
    this.setUpdateTime();
  },

  onShow() {},

  // 设置更新时间
  setUpdateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    this.setData({
      updateTime: `${year}.${month}.${day} ${hours}:${minutes}`,
    });
  },

  // 联系医生
  contactDoctor() {
    wx.showActionSheet({
      itemList: ["拨打电话", "发送邮件", "在线咨询"],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            // 拨打电话
            this.makePhoneCall();
            break;
          case 1:
            // 发送邮件
            this.sendEmail();
            break;
          case 2:
            // 在线咨询
            this.onlineConsult();
            break;
        }
      },
      fail: (res) => {},
    });
  },

  // 拨打电话
  makePhoneCall() {
    wx.makePhoneCall({
      phoneNumber: this.data.doctorData.phone,
      success: () => {},
      fail: (err) => {
        wx.showToast({
          title: "拨打电话失败",
          icon: "error",
        });
      },
    });
  },

  // 发送邮件
  sendEmail() {
    // 复制邮箱地址到剪贴板
    wx.setClipboardData({
      data: this.data.doctorData.email,
      success: () => {
        wx.showToast({
          title: "邮箱地址已复制",
          icon: "success",
        });
      },
      fail: () => {
        wx.showToast({
          title: "复制失败",
          icon: "error",
        });
      },
    });
  },

  // 在线咨询
  onlineConsult() {
    wx.showToast({
      title: "正在跳转到在线咨询",
      icon: "loading",
      duration: 1500,
    });

    // 可以跳转到AI助手页面
    setTimeout(() => {
      wx.navigateTo({
        url: "/pages/ai-doctor/ai-doctor",
      });
    }, 1500);
  },

  // 返回上一页
  goBack() {
    wx.navigateBack({
      delta: 1,
    });
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: "主治医生信息 - 患者健康监测",
      path: "/pages/doctor-info/doctor-info",
      imageUrl: "/images/主治医生头像.png",
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: "主治医生信息 - 患者健康监测",
      imageUrl: "/images/主治医生头像.png",
    };
  },
});
