package com.lingshu.smart.monitor.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log

/**
 * 网络工具类
 * 提供网络状态检查和网络相关功能
 */
object NetworkUtils {
    
    private const val TAG = "NetworkUtils"
    
    /**
     * 检查网络连接状态
     */
    fun isNetworkAvailable(context: Context): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        return try {
            val network = connectivityManager.activeNetwork ?: return false
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
            
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
        } catch (e: Exception) {
            Log.e(TAG, "检查网络状态失败", e)
            false
        }
    }
    
    /**
     * 检查是否为WiFi连接
     */
    fun isWifiConnected(context: Context): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        return try {
            val network = connectivityManager.activeNetwork ?: return false
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
        } catch (e: Exception) {
            Log.e(TAG, "检查WiFi状态失败", e)
            false
        }
    }
    
    /**
     * 检查是否为移动网络连接
     */
    fun isCellularConnected(context: Context): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        return try {
            val network = connectivityManager.activeNetwork ?: return false
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
        } catch (e: Exception) {
            Log.e(TAG, "检查移动网络状态失败", e)
            false
        }
    }
    
    /**
     * 获取网络类型描述
     */
    fun getNetworkTypeDescription(context: Context): String {
        return when {
            isWifiConnected(context) -> "WiFi"
            isCellularConnected(context) -> "移动网络"
            isNetworkAvailable(context) -> "其他网络"
            else -> "无网络连接"
        }
    }
}
