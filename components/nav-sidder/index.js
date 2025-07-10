// nav-sidder组件 - 侧边栏组件
Component({
  options: {
    multipleSlots: true, // 启用多个插槽
  },

  properties: {
    visible: {
      // 是否显示侧边栏
      type: Boolean,
      value: false,
    },
    disableTransition: {
      // 是否禁用动画
      type: Boolean,
      value: false,
    },
  },

  data: {
    menuButtonRect: {}, // 菜单按钮位置信息
  },

  lifetimes: {
    attached() {
      // 获取菜单按钮位置信息
      const menuButtonRect = wx.getMenuButtonBoundingClientRect();
      this.setData({
        menuButtonRect,
      });
    },
  },

  methods: {
    // 关闭侧边栏
    handleClose() {
      this.triggerEvent("onClose");
    },

    // 点击遮罩关闭侧边栏
    handleMaskClick() {
      this.triggerEvent("onMaskClick");
    },
  },
});
