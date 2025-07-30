package com.lingshu.smart.monitor.di

import android.content.Context
import com.lingshu.smart.monitor.data.repository.HealthDataRepository
import com.lingshu.smart.monitor.network.MqttManager
import com.lingshu.smart.monitor.network.ApiService
import com.lingshu.smart.monitor.network.AiAssistantManager
import com.lingshu.smart.monitor.network.CozeApiService
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

    // Coze API Retrofit实例
    private val cozeRetrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl("https://api.coze.cn/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    // Coze API服务接口
    private val cozeApiService: CozeApiService by lazy {
        cozeRetrofit.create(CozeApiService::class.java)
    }

    // AI助手管理器
    val aiAssistantManager: AiAssistantManager by lazy {
        AiAssistantManager(cozeApiService)
    }

    // 数据仓库（使用SharedPreferences替代Room）
    val healthDataRepository: HealthDataRepository by lazy {
        HealthDataRepository(
            context,
            mqttManager
        )
    }
}
