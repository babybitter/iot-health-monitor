package com.lingshu.smart.monitor.utils

import android.content.Context
import android.content.SharedPreferences
import androidx.appcompat.app.AppCompatDelegate

/**
 * 主题管理器
 * 管理应用的明亮/暗黑主题切换
 */
class ThemeManager(context: Context) {
    
    companion object {
        private const val PREFS_NAME = "theme_prefs"
        private const val KEY_THEME_MODE = "theme_mode"
        
        // 主题模式常量
        const val THEME_LIGHT = 0
        const val THEME_DARK = 1
        const val THEME_SYSTEM = 2
    }
    
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    /**
     * 获取当前主题模式
     */
    fun getCurrentTheme(): Int {
        return prefs.getInt(KEY_THEME_MODE, THEME_SYSTEM)
    }
    
    /**
     * 设置主题模式
     */
    fun setTheme(themeMode: Int) {
        prefs.edit().putInt(KEY_THEME_MODE, themeMode).apply()
        applyTheme(themeMode)
    }
    
    /**
     * 应用主题
     */
    fun applyTheme(themeMode: Int = getCurrentTheme()) {
        when (themeMode) {
            THEME_LIGHT -> AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
            THEME_DARK -> AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES)
            THEME_SYSTEM -> AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
        }
    }
    
    /**
     * 切换到下一个主题模式
     */
    fun toggleTheme(): Int {
        val currentTheme = getCurrentTheme()
        val nextTheme = when (currentTheme) {
            THEME_LIGHT -> THEME_DARK
            THEME_DARK -> THEME_SYSTEM
            THEME_SYSTEM -> THEME_LIGHT
            else -> THEME_LIGHT
        }
        setTheme(nextTheme)
        return nextTheme
    }
    
    /**
     * 获取主题模式名称
     */
    fun getThemeName(themeMode: Int): String {
        return when (themeMode) {
            THEME_LIGHT -> "明亮主题"
            THEME_DARK -> "暗黑主题"
            THEME_SYSTEM -> "跟随系统"
            else -> "未知主题"
        }
    }
    
    /**
     * 是否为暗黑主题
     */
    fun isDarkTheme(): Boolean {
        return getCurrentTheme() == THEME_DARK
    }
}
