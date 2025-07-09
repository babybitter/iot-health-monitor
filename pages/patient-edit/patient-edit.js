// 患者信息编辑页面
Page({
  data: {
    editData: {
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
    originalData: {}, // 保存原始数据，用于取消时恢复
    bloodTypes: ["A型", "B型", "AB型", "O型", "RH阴性", "未知"],
    bloodTypeIndex: 0,
    departments: [
      "心内科",
      "神经内科",
      "ICU",
      "急诊科",
      "呼吸内科",
      "消化内科",
      "内分泌科",
      "肾内科",
      "血液科",
      "肿瘤科",
    ],
    departmentIndex: 0,
    hasChanges: false, // 标记是否有修改
  },

  onLoad(options) {
    // 获取传入的患者数据
    if (options.patientData) {
      const patientData = JSON.parse(decodeURIComponent(options.patientData));
      this.setData({
        editData: { ...patientData },
        originalData: { ...patientData },
      });
    }
    this.initPickerIndex();
  },

  onReady() {
    wx.setNavigationBarTitle({
      title: "编辑患者信息",
    });
  },

  // 初始化选择器索引
  initPickerIndex() {
    const { bloodTypes, departments, editData } = this.data;
    const bloodTypeIndex = bloodTypes.indexOf(editData.bloodType);
    const departmentIndex = departments.indexOf(editData.department);

    this.setData({
      bloodTypeIndex: bloodTypeIndex >= 0 ? bloodTypeIndex : 0,
      departmentIndex: departmentIndex >= 0 ? departmentIndex : 0,
    });
  },

  // 年龄输入
  onAgeInput(e) {
    const age = parseInt(e.detail.value) || 0;
    if (age > 150) {
      wx.showToast({
        title: "年龄不能超过150岁",
        icon: "none",
      });
      return;
    }
    this.setData({
      "editData.age": age,
      hasChanges: true,
    });
  },

  // 身高输入
  onHeightInput(e) {
    const height = parseInt(e.detail.value) || 0;
    if (height > 250) {
      wx.showToast({
        title: "身高不能超过250cm",
        icon: "none",
      });
      return;
    }
    this.setData({
      "editData.height": height,
      hasChanges: true,
    });
  },

  // 性别选择
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      "editData.gender": gender,
      hasChanges: true,
    });
  },

  // 体重输入
  onWeightInput(e) {
    const weight = parseFloat(e.detail.value) || 0;
    if (weight > 500) {
      wx.showToast({
        title: "体重不能超过500kg",
        icon: "none",
      });
      return;
    }
    this.setData({
      "editData.weight": weight,
      hasChanges: true,
    });
  },

  // 血型选择
  onBloodTypeChange(e) {
    const index = e.detail.value;
    const bloodType = this.data.bloodTypes[index];
    this.setData({
      bloodTypeIndex: index,
      "editData.bloodType": bloodType,
      hasChanges: true,
    });
  },

  // 过敏史输入
  onAllergiesInput(e) {
    this.setData({
      "editData.allergies": e.detail.value,
      hasChanges: true,
    });
  },

  // 床位号输入
  onBedNumberInput(e) {
    this.setData({
      "editData.bedNumber": e.detail.value,
      hasChanges: true,
    });
  },

  // 科室选择
  onDepartmentChange(e) {
    const index = e.detail.value;
    const department = this.data.departments[index];
    this.setData({
      departmentIndex: index,
      "editData.department": department,
      hasChanges: true,
    });
  },

  // 验证数据
  validateData() {
    const { editData } = this.data;

    if (!editData.age || editData.age <= 0) {
      wx.showToast({
        title: "请输入有效的年龄",
        icon: "none",
      });
      return false;
    }

    if (!editData.height || editData.height <= 0) {
      wx.showToast({
        title: "请输入有效的身高",
        icon: "none",
      });
      return false;
    }

    if (!editData.weight || editData.weight <= 0) {
      wx.showToast({
        title: "请输入有效的体重",
        icon: "none",
      });
      return false;
    }

    if (!editData.bloodType) {
      wx.showToast({
        title: "请选择血型",
        icon: "none",
      });
      return false;
    }

    if (!editData.allergies.trim()) {
      wx.showToast({
        title: "请填写过敏史",
        icon: "none",
      });
      return false;
    }

    if (!editData.bedNumber.trim()) {
      wx.showToast({
        title: "请填写床位号",
        icon: "none",
      });
      return false;
    }

    if (!editData.department) {
      wx.showToast({
        title: "请选择科室",
        icon: "none",
      });
      return false;
    }

    return true;
  },

  // 保存信息
  saveInfo() {
    if (!this.validateData()) {
      return;
    }

    wx.showModal({
      title: "确认保存",
      content: "确定要保存修改的患者信息吗？",
      success: (res) => {
        if (res.confirm) {
          this.performSave();
        }
      },
    });
  },

  // 执行保存
  performSave() {
    wx.showLoading({
      title: "保存中...",
    });

    // 模拟保存过程
    setTimeout(() => {
      wx.hideLoading();

      // 保存到本地存储
      wx.setStorageSync("patientData", this.data.editData);

      wx.showToast({
        title: "保存成功",
        icon: "success",
        duration: 2000,
      });

      // 返回上一页并传递更新的数据
      setTimeout(() => {
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage) {
          prevPage.setData({
            patientData: this.data.editData,
          });
          if (prevPage.setUpdateTime) {
            prevPage.setUpdateTime();
          }
        }
        wx.navigateBack();
      }, 2000);
    }, 1000);
  },

  // 取消编辑
  cancelEdit() {
    if (this.data.hasChanges) {
      wx.showModal({
        title: "确认取消",
        content: "您有未保存的修改，确定要取消吗？",
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack();
          }
        },
      });
    } else {
      wx.navigateBack();
    }
  },

  // 页面卸载时的确认
  onUnload() {
    // 页面卸载时不需要特殊处理，因为已经在cancelEdit中处理了
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: "患者信息编辑",
      path: "/pages/patient-edit/patient-edit",
    };
  },
});
