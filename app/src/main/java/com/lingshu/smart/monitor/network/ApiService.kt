package com.lingshu.smart.monitor.network

import com.lingshu.smart.monitor.data.model.HealthData
import retrofit2.Response
import retrofit2.http.*

/**
 * 网络API服务接口
 * 定义与后端服务器的通信接口
 */
interface ApiService {
    
    /**
     * 上传健康数据
     */
    @POST("api/health/upload")
    suspend fun uploadHealthData(@Body data: HealthData): Response<ApiResponse<String>>
    
    /**
     * 获取历史健康数据
     */
    @GET("api/health/history")
    suspend fun getHealthHistory(
        @Query("deviceId") deviceId: String,
        @Query("startTime") startTime: Long,
        @Query("endTime") endTime: Long
    ): Response<ApiResponse<List<HealthData>>>
    
    /**
     * 获取设备状态
     */
    @GET("api/device/status/{deviceId}")
    suspend fun getDeviceStatus(@Path("deviceId") deviceId: String): Response<ApiResponse<DeviceStatusResponse>>
    
    /**
     * 更新设备配置
     */
    @PUT("api/device/config/{deviceId}")
    suspend fun updateDeviceConfig(
        @Path("deviceId") deviceId: String,
        @Body config: DeviceConfig
    ): Response<ApiResponse<String>>
}

/**
 * API响应包装类
 */
data class ApiResponse<T>(
    val success: Boolean,
    val message: String,
    val data: T?
)

/**
 * 设备状态响应
 */
data class DeviceStatusResponse(
    val deviceId: String,
    val isOnline: Boolean,
    val batteryLevel: Int,
    val lastSeen: Long,
    val firmwareVersion: String
)

/**
 * 设备配置
 */
data class DeviceConfig(
    val samplingInterval: Int, // 采样间隔（秒）
    val alertThresholds: AlertThresholds,
    val autoUpload: Boolean
)

/**
 * 报警阈值配置
 */
data class AlertThresholds(
    val heartRateMin: Int = 60,
    val heartRateMax: Int = 100,
    val temperatureMin: Float = 36.0f,
    val temperatureMax: Float = 37.5f,
    val bloodPressureSystolicMax: Int = 140,
    val bloodPressureDiastolicMax: Int = 90,
    val oxygenSaturationMin: Int = 95
)
