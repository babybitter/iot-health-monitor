package com.lingshu.smart.monitor.data.model

/**
 * 聊天消息数据模型
 */
data class ChatMessage(
    val id: String,
    val role: MessageRole,
    val content: String,
    val timestamp: Long,
    val isStreaming: Boolean = false
) {
    
    /**
     * 获取格式化的时间字符串
     */
    fun getFormattedTime(): String {
        val sdf = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
        return sdf.format(java.util.Date(timestamp))
    }
}

/**
 * 消息角色枚举
 */
enum class MessageRole {
    USER,    // 用户消息
    ASSISTANT // AI助手消息
}

/**
 * AI聊天专用的健康数据模型
 */
data class ChatHealthData(
    val heartRate: HealthMetric? = null,
    val bloodOxygen: HealthMetric? = null,
    val bodyTemperature: HealthMetric? = null,
    val breathingRate: HealthMetric? = null,
    val environmentTemperature: HealthMetric? = null,
    val humidity: HealthMetric? = null,
    val lightIntensity: HealthMetric? = null,
    val pressure: HealthMetric? = null
)

/**
 * 健康指标数据
 */
data class HealthMetric(
    val value: String,
    val status: HealthStatus = HealthStatus.NORMAL,
    val unit: String = ""
)

/**
 * 健康状态枚举
 */
enum class HealthStatus {
    NORMAL,   // 正常
    WARNING,  // 警告
    DANGER    // 危险
}
