package com.lingshu.smart.monitor

import android.app.Application
import com.google.android.material.color.DynamicColors
import com.lingshu.smart.monitor.di.AppContainer
import com.lingshu.smart.monitor.utils.MarkdownUtils

/**
 * 灵枢监测助手应用程序类
 * 配置Material Design 3动态颜色和依赖注入
 */
class HealthMonitorApplication : Application() {

    // 应用依赖注入容器
    lateinit var appContainer: AppContainer

    override fun onCreate() {
        super.onCreate()

        // 初始化依赖注入容器
        appContainer = AppContainer(this)

        // 初始化Markdown工具
        MarkdownUtils.init(this)

        // 启用Material Design 3动态颜色（莫奈取色）
        DynamicColors.applyToActivitiesIfAvailable(this)
    }
}
