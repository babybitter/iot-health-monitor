package com.lingshu.smart.monitor.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.lingshu.smart.monitor.data.model.HealthData
import com.lingshu.smart.monitor.data.model.DeviceStatus
import com.lingshu.smart.monitor.data.model.AlertData
import com.lingshu.smart.monitor.network.MqttManager
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Date

/**
 * 健康数据仓库
 * 使用SharedPreferences替代Room数据库，避免注解处理器问题
 */
class HealthDataRepository(
    private val context: Context,
    private val mqttManager: MqttManager
) {
    private val prefs: SharedPreferences = 
        context.getSharedPreferences("health_data", Context.MODE_PRIVATE)
    private val gson = Gson()
    
    // 数据流
    private val _healthDataList = MutableStateFlow<List<HealthData>>(emptyList())
    val healthDataList: Flow<List<HealthData>> = _healthDataList.asStateFlow()
    
    private val _deviceStatus = MutableStateFlow<List<DeviceStatus>>(emptyList())
    val deviceStatus: Flow<List<DeviceStatus>> = _deviceStatus.asStateFlow()
    
    private val _alerts = MutableStateFlow<List<AlertData>>(emptyList())
    val alerts: Flow<List<AlertData>> = _alerts.asStateFlow()
    
    init {
        loadData()
    }
    
    /**
     * 加载本地数据
     */
    private fun loadData() {
        // 加载健康数据
        val healthDataJson = prefs.getString("health_data_list", "[]")
        val healthDataType = object : TypeToken<List<HealthData>>() {}.type
        val healthData = gson.fromJson<List<HealthData>>(healthDataJson, healthDataType)
        _healthDataList.value = healthData
        
        // 加载设备状态
        val deviceStatusJson = prefs.getString("device_status_list", "[]")
        val deviceStatusType = object : TypeToken<List<DeviceStatus>>() {}.type
        val deviceStatus = gson.fromJson<List<DeviceStatus>>(deviceStatusJson, deviceStatusType)
        _deviceStatus.value = deviceStatus
        
        // 加载报警数据
        val alertsJson = prefs.getString("alerts_list", "[]")
        val alertsType = object : TypeToken<List<AlertData>>() {}.type
        val alerts = gson.fromJson<List<AlertData>>(alertsJson, alertsType)
        _alerts.value = alerts
    }
    
    /**
     * 保存健康数据
     */
    suspend fun saveHealthData(data: HealthData) {
        val currentList = _healthDataList.value.toMutableList()
        currentList.add(data.copy(id = System.currentTimeMillis()))
        _healthDataList.value = currentList
        
        // 保存到SharedPreferences
        val json = gson.toJson(currentList)
        prefs.edit().putString("health_data_list", json).apply()
    }
    
    /**
     * 获取最新的健康数据
     */
    fun getLatestHealthData(): HealthData? {
        return _healthDataList.value.maxByOrNull { it.timestamp }
    }
    
    /**
     * 更新设备状态
     */
    suspend fun updateDeviceStatus(status: DeviceStatus) {
        val currentList = _deviceStatus.value.toMutableList()
        val index = currentList.indexOfFirst { it.deviceId == status.deviceId }
        if (index >= 0) {
            currentList[index] = status
        } else {
            currentList.add(status)
        }
        _deviceStatus.value = currentList
        
        // 保存到SharedPreferences
        val json = gson.toJson(currentList)
        prefs.edit().putString("device_status_list", json).apply()
    }
    
    /**
     * 添加报警
     */
    suspend fun addAlert(alert: AlertData) {
        val currentList = _alerts.value.toMutableList()
        currentList.add(alert.copy(id = System.currentTimeMillis()))
        _alerts.value = currentList
        
        // 保存到SharedPreferences
        val json = gson.toJson(currentList)
        prefs.edit().putString("alerts_list", json).apply()
    }
}
