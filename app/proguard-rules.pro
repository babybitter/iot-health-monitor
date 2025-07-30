# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Retrofit混淆规则
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes Exceptions

# OkHttp混淆规则
-dontwarn okhttp3.**
-keep class okhttp3.** { *; }
-dontwarn okio.**
-keep class okio.** { *; }

# Gson混淆规则
-dontwarn com.google.gson.**
-keep class com.google.gson.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# Coze API相关类不混淆
-keep class com.lingshu.smart.monitor.network.CozeApiService { *; }
-keep class com.lingshu.smart.monitor.network.CozeApiRequest { *; }
-keep class com.lingshu.smart.monitor.network.CozeApiResponse { *; }
-keep class com.lingshu.smart.monitor.network.AiAssistantManager { *; }

# 保持所有网络相关类
-keep class com.lingshu.smart.monitor.network.** { *; }

# Kotlin协程
-dontwarn kotlinx.coroutines.**
-keep class kotlinx.coroutines.** { *; }