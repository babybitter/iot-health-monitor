// 患者基本信息页面
Page({
  data: {
    patientData: {
      id: "MED000156",
      age: 50,
      height: 173,
      gender: "男",
      weight: 70,
      bloodType: "A型",
      allergies: "无",
      bedNumber: "301床",
      department: "心内科",
    },
    updateTime: "",
  },

  onLoad(options) {
    this.setUpdateTime();
  },

  onReady() {
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: "患者基本信息",
    });
  },

  onShow() {},

  // 设置更新时间
  setUpdateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");

    this.setData({
      updateTime: `${year}.${month}.${day} ${hour}:${minute}`,
    });
  },

  // 编辑信息
  editInfo() {
    const patientDataStr = encodeURIComponent(
      JSON.stringify(this.data.patientData)
    );
    wx.navigateTo({
      url: `/pages/patient-edit/patient-edit?patientData=${patientDataStr}`,
    });
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
      title: "患者基本信息",
      path: "/pages/patient-info/patient-info",
    };
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setUpdateTime();

    // 模拟数据刷新
    setTimeout(() => {
      wx.stopPullDownRefresh();
      wx.showToast({
        title: "信息已更新",
        icon: "success",
      });
    }, 1000);
  },

  // 复制信息到剪贴板
  copyInfo(e) {
    const info = e.currentTarget.dataset.info;
    wx.setClipboardData({
      data: info,
      success: () => {
        wx.showToast({
          title: "已复制到剪贴板",
          icon: "success",
        });
      },
    });
  },
});
