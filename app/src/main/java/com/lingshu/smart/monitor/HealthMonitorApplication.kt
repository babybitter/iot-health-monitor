package com.lingshu.smart.monitor

import android.app.Application
import com.google.android.material.color.DynamicColors
import dagger.hilt.android.HiltAndroidApp

/**
 * 灵枢监测助手应用程序类
 * 配置Hilt依赖注入和Material Design 3动态颜色
 */
@HiltAndroidApp
class HealthMonitorApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // 启用Material Design 3动态颜色（莫奈取色）
        DynamicColors.applyToActivitiesIfAvailable(this)
    }
}
