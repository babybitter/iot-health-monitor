package com.lingshu.smart.monitor.data

data class SmartDevice(
    val name: String, // 设备名称
    val iconRes: Int, // 图标资源ID
    var isOn: Boolean = false // 开关状态
)
