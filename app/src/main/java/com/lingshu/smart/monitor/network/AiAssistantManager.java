package com.lingshu.smart.monitor.network;

import android.util.Log;
import com.lingshu.smart.monitor.data.model.ChatHealthData;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * AI助手管理器 (Java版本)
 */
public class AiAssistantManager {
    
    private static final String TAG = "AiAssistantManager";
    private static final String BOT_ID = "7527888216448401451";
    
    private final CozeApiService cozeApiService;
    
    public AiAssistantManager(CozeApiService cozeApiService) {
        this.cozeApiService = cozeApiService;
    }
    
    /**
     * 发送消息到Coze API
     */
    public void sendMessage(
        String message,
        ChatHealthData healthData,
        StreamCallback onProgress,
        ErrorCallback onError
    ) {
        try {
            Log.d(TAG, "开始调用Coze API: " + message);
            
            // 构建请求 (v3格式)
            String enhancedMessage = buildEnhancedMessage(message, healthData);
            CozeApiRequest request = new CozeApiRequest(
                BOT_ID,
                "user_" + System.currentTimeMillis(),
                enhancedMessage,
                false
            );
            
            // 发送请求
            Call<CozeApiResponse> call = cozeApiService.sendMessage(request);
            call.enqueue(new Callback<CozeApiResponse>() {
                @Override
                public void onResponse(Call<CozeApiResponse> call, Response<CozeApiResponse> response) {
                    if (response.isSuccessful() && response.body() != null) {
                        CozeApiResponse apiResponse = response.body();
                        Log.d(TAG, "Coze API初始响应: code=" + apiResponse.getCode() + ", msg=" + apiResponse.getMsg());

                        if (apiResponse.getCode() == 0 && apiResponse.getData() != null) {
                            String chatId = apiResponse.getData().getId();
                            String conversationId = apiResponse.getData().getConversation_id();
                            Log.d(TAG, "获得chat_id: " + chatId + ", conversation_id: " + conversationId);

                            // 开始轮询获取消息
                            pollForMessages(chatId, conversationId, onProgress, onError, 0);
                        } else {
                            String errorMsg = "API返回错误: code=" + apiResponse.getCode() + ", msg=" + apiResponse.getMsg();
                            Log.e(TAG, errorMsg);
                            if (onError != null) {
                                onError.onError(new Exception(errorMsg));
                            }
                        }
                    } else {
                        String errorMsg = "HTTP错误: " + response.code() + " " + response.message();
                        Log.e(TAG, errorMsg);
                        if (onError != null) {
                            onError.onError(new Exception(errorMsg));
                        }
                    }
                }
                
                @Override
                public void onFailure(Call<CozeApiResponse> call, Throwable t) {
                    Log.e(TAG, "Coze API调用失败", t);
                    if (onError != null) {
                        onError.onError(t);
                    }
                }
            });
            
        } catch (Exception e) {
            Log.e(TAG, "发送消息异常", e);
            if (onError != null) {
                onError.onError(e);
            }
        }
    }

    /**
     * 轮询获取消息结果
     */
    private void pollForMessages(String chatId, String conversationId, StreamCallback onProgress, ErrorCallback onError, int attempt) {
        if (attempt >= 5) { // 最多重试5次
            Log.e(TAG, "轮询超时，未能获取到AI回复");
            if (onError != null) {
                onError.onError(new Exception("轮询超时，AI可能正在处理中，请稍后重试"));
            }
            return;
        }

        // 等待3秒后再查询（给AI时间处理）
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            Log.d(TAG, "开始第" + (attempt + 1) + "次轮询消息");

            Call<CozeMessageResponse> messageCall = cozeApiService.getMessages(chatId, conversationId);
            messageCall.enqueue(new Callback<CozeMessageResponse>() {
                @Override
                public void onResponse(Call<CozeMessageResponse> call, Response<CozeMessageResponse> response) {
                    if (response.isSuccessful() && response.body() != null) {
                        CozeMessageResponse messageResponse = response.body();
                        Log.d(TAG, "消息轮询响应: code=" + messageResponse.getCode());

                        if (messageResponse.getCode() == 0 && messageResponse.getData() != null) {
                            // 查找AI的回复
                            for (CozeMessageResponse.MessageData message : messageResponse.getData()) {
                                if ("assistant".equals(message.getRole()) && "answer".equals(message.getType())) {
                                    String content = message.getContent();
                                    String status = message.getStatus();
                                    Log.d(TAG, "找到AI回复: " + content + ", 状态: " + status);

                                    // 检查消息是否完整（状态为completed或内容长度合理）
                                    if ("completed".equals(status) ||
                                        (content != null && content.length() > 10 && !content.trim().endsWith("..."))) {
                                        if (onProgress != null) {
                                            onProgress.onProgress(content, true);
                                        }
                                        return;
                                    } else {
                                        // 消息还在生成中，继续轮询
                                        Log.d(TAG, "AI回复还在生成中，继续轮询");
                                        pollForMessages(chatId, conversationId, onProgress, onError, attempt + 1);
                                        return;
                                    }
                                }
                            }

                            // 没找到回复，继续轮询
                            Log.d(TAG, "未找到AI回复，继续轮询");
                            pollForMessages(chatId, conversationId, onProgress, onError, attempt + 1);
                        } else {
                            Log.e(TAG, "获取消息失败: " + messageResponse.getMsg());
                            pollForMessages(chatId, conversationId, onProgress, onError, attempt + 1);
                        }
                    } else {
                        Log.e(TAG, "消息轮询HTTP错误: " + response.code());
                        pollForMessages(chatId, conversationId, onProgress, onError, attempt + 1);
                    }
                }

                @Override
                public void onFailure(Call<CozeMessageResponse> call, Throwable t) {
                    Log.e(TAG, "消息轮询网络错误", t);
                    pollForMessages(chatId, conversationId, onProgress, onError, attempt + 1);
                }
            });
        }, 3000); // 等待3秒
    }

    /**
     * 构建增强消息（包含健康数据上下文）
     */
    private String buildEnhancedMessage(String message, ChatHealthData healthData) {
        StringBuilder enhancedMessage = new StringBuilder();
        enhancedMessage.append("用户问题: ").append(message).append("\n\n");
        
        if (healthData != null) {
            enhancedMessage.append("当前健康数据:\n");
            
            if (healthData.getHeartRate() != null) {
                enhancedMessage.append("- 心率: ").append(healthData.getHeartRate().getValue()).append("次/分\n");
            }
            
            if (healthData.getBloodOxygen() != null) {
                enhancedMessage.append("- 血氧: ").append(healthData.getBloodOxygen().getValue()).append("%\n");
            }
            
            if (healthData.getBodyTemperature() != null) {
                enhancedMessage.append("- 体温: ").append(healthData.getBodyTemperature().getValue()).append("°C\n");
            }
            
            enhancedMessage.append("\n请基于以上健康数据提供专业的健康建议和分析。");
        }
        
        return enhancedMessage.toString();
    }
    
    /**
     * 流式回调接口
     */
    public interface StreamCallback {
        void onProgress(String content, boolean isComplete);
    }
    
    /**
     * 错误回调接口
     */
    public interface ErrorCallback {
        void onError(Throwable error);
    }
}
