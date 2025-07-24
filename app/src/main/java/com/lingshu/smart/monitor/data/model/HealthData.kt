package com.lingshu.smart.monitor.data.model

import java.util.Date

/**
 * 健康数据模型
 * 简化版本，不使用Room注解处理器
 */
data class HealthData(
    val id: Long = 0,
    val timestamp: Date = Date(),
    val heartRate: Int = 0,
    val bloodPressureSystolic: Int = 0,
    val bloodPressureDiastolic: Int = 0,
    val temperature: Float = 0f,
    val oxygenSaturation: Int = 0,
    val deviceId: String = "",
    val notes: String = ""
)

/**
 * 设备状态数据
 */
data class DeviceStatus(
    val deviceId: String,
    val isOnline: Boolean,
    val batteryLevel: Int,
    val lastSeen: Date
)

/**
 * 报警数据
 */
data class AlertData(
    val id: Long = 0,
    val type: AlertType,
    val message: String,
    val timestamp: Date = Date(),
    val isRead: Boolean = false
)

/**
 * 报警类型枚举
 */
enum class AlertType {
    HIGH_HEART_RATE,
    LOW_HEART_RATE,
    HIGH_BLOOD_PRESSURE,
    LOW_BLOOD_PRESSURE,
    HIGH_TEMPERATURE,
    LOW_TEMPERATURE,
    LOW_OXYGEN,
    DEVICE_OFFLINE
}
