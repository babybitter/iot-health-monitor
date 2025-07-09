// 家属联系方式页面
Page({
  data: {
    familyList: [], // 家属列表
    showModal: false, // 是否显示弹窗
    modalTitle: "添加家属", // 弹窗标题
    editingId: null, // 正在编辑的家属ID
    relationOptions: ["配偶", "子女", "父母"], // 关系选项
    formData: {
      // 表单数据
      name: "",
      relation: "",
      relationIndex: 0,
      phone: "",
      isEmergency: false,
    },
    updateTime: "",
  },

  onLoad() {
    this.loadFamilyData();
    this.setUpdateTime();
  },

  onShow() {
    this.loadFamilyData();
  },

  // 加载家属数据
  loadFamilyData() {
    try {
      const familyData = wx.getStorageSync("family_contacts") || [];

      this.setData({
        familyList: familyData,
      });
    } catch (error) {
      this.setData({
        familyList: [],
      });
    }
  },

  // 保存家属数据到本地存储
  saveFamilyData() {
    try {
      wx.setStorageSync("family_contacts", this.data.familyList);
      this.setUpdateTime();
    } catch (error) {
      wx.showToast({
        title: "保存失败",
        icon: "error",
      });
    }
  },

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

  // 添加家属
  addFamily() {
    this.setData({
      showModal: true,
      modalTitle: "添加家属",
      editingId: null,
      formData: {
        name: "",
        relation: "",
        relationIndex: 0,
        phone: "",
        isEmergency: false,
      },
    });
  },

  // 编辑家属
  editFamily(e) {
    const id = e.currentTarget.dataset.id;
    const family = this.data.familyList.find((item) => item.id === id);

    if (family) {
      const relationIndex = this.data.relationOptions.indexOf(family.relation);

      this.setData({
        showModal: true,
        modalTitle: "编辑家属",
        editingId: id,
        formData: {
          name: family.name,
          relation: family.relation,
          relationIndex: relationIndex >= 0 ? relationIndex : 0,
          phone: family.phone,
          isEmergency: family.isEmergency,
        },
      });
    }
  },

  // 删除家属
  deleteFamily(e) {
    const id = e.currentTarget.dataset.id;
    const family = this.data.familyList.find((item) => item.id === id);

    if (family) {
      wx.showModal({
        title: "确认删除",
        content: `确定要删除家属"${family.name}"的联系方式吗？`,
        success: (res) => {
          if (res.confirm) {
            const newFamilyList = this.data.familyList.filter(
              (item) => item.id !== id
            );
            this.setData({
              familyList: newFamilyList,
            });

            this.saveFamilyData();

            wx.showToast({
              title: "删除成功",
              icon: "success",
            });
          }
        },
      });
    }
  },

  // 拨打电话
  makeCall(e) {
    const phone = e.currentTarget.dataset.phone;

    wx.makePhoneCall({
      phoneNumber: phone,
      success: () => {},
      fail: (err) => {
        wx.showToast({
          title: "拨打电话失败",
          icon: "error",
        });
      },
    });
  },

  // 关闭弹窗
  closeModal() {
    // 先移除show类，触发关闭动画
    const query = wx.createSelectorQuery();
    query.select(".bottom-modal-content").boundingClientRect();
    query.exec(() => {
      // 延迟关闭弹窗，让动画完成
      setTimeout(() => {
        this.setData({
          showModal: false,
          editingId: null,
        });
      }, 300); // 与CSS动画时间一致
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止点击弹窗内容时关闭弹窗
  },

  // 表单输入事件
  onNameInput(e) {
    this.setData({
      "formData.name": e.detail.value,
    });
  },

  onPhoneInput(e) {
    this.setData({
      "formData.phone": e.detail.value,
    });
  },

  onRelationChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      "formData.relationIndex": index,
      "formData.relation": this.data.relationOptions[index],
    });
  },

  onEmergencyChange(e) {
    this.setData({
      "formData.isEmergency": e.detail.value,
    });
  },

  // 保存家属信息
  saveFamily() {
    const { name, relation, phone, isEmergency } = this.data.formData;

    // 表单验证
    if (!name.trim()) {
      wx.showToast({
        title: "请输入姓名",
        icon: "error",
      });
      return;
    }

    if (!relation) {
      wx.showToast({
        title: "请选择关系",
        icon: "error",
      });
      return;
    }

    if (!phone.trim()) {
      wx.showToast({
        title: "请输入电话号码",
        icon: "error",
      });
      return;
    }

    // 验证电话号码格式
    const phoneRegex = /^1[3-9]\d{9}$|^0\d{2,3}-?\d{7,8}$/;
    if (!phoneRegex.test(phone.trim())) {
      wx.showToast({
        title: "电话号码格式不正确",
        icon: "error",
      });
      return;
    }

    const familyData = {
      id: this.data.editingId || Date.now().toString(),
      name: name.trim(),
      relation: relation,
      phone: phone.trim(),
      isEmergency: isEmergency,
      createTime: this.data.editingId ? undefined : new Date().toISOString(),
      updateTime: new Date().toISOString(),
    };

    let newFamilyList = [...this.data.familyList];

    if (this.data.editingId) {
      // 编辑模式
      const index = newFamilyList.findIndex(
        (item) => item.id === this.data.editingId
      );
      if (index >= 0) {
        newFamilyList[index] = { ...newFamilyList[index], ...familyData };
      }
    } else {
      // 添加模式
      newFamilyList.push(familyData);
    }

    this.setData({
      familyList: newFamilyList,
    });

    this.saveFamilyData();

    // 延迟关闭弹窗，显示保存成功提示
    setTimeout(() => {
      this.setData({
        showModal: false,
        editingId: null,
      });
    }, 300);

    wx.showToast({
      title: this.data.editingId ? "更新成功" : "添加成功",
      icon: "success",
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
      title: "家属联系方式 - 患者健康监测",
      path: "/pages/family-contact/family-contact",
    };
  },
});
