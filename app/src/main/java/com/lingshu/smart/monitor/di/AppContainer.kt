package com.lingshu.smart.monitor.di

import android.content.Context
import com.lingshu.smart.monitor.data.repository.HealthDataRepository
import com.lingshu.smart.monitor.network.MqttManager
import com.lingshu.smart.monitor.network.ApiService
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

/**
 * 应用依赖注入容器
 * 替代Hilt，提供简单的手动依赖注入
 */
class AppContainer(private val context: Context) {

    // 网络服务
    val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl("https://api.lingshu.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    // API服务
    val apiService: ApiService by lazy {
        retrofit.create(ApiService::class.java)
    }

    // MQTT管理器
    val mqttManager: MqttManager by lazy {
        MqttManager(context)
    }

    // 数据仓库（使用SharedPreferences替代Room）
    val healthDataRepository: HealthDataRepository by lazy {
        HealthDataRepository(
            context,
            mqttManager
        )
    }
}
