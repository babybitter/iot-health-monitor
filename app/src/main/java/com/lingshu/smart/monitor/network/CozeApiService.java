package com.lingshu.smart.monitor.network;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.Headers;
import retrofit2.http.POST;
import retrofit2.http.Query;

/**
 * Coze API服务接口 (Java版本)
 */
public interface CozeApiService {
    
    @Headers({
        "Authorization: Bearer pat_MLV34Er7REuA1og5WIGfq1LKzZdNDdYLZlkISChL9e12PaVoifTBKGiTR47rmUcu",
        "Content-Type: application/json"
    })
    @POST("v3/chat")
    Call<CozeApiResponse> sendMessage(@Body CozeApiRequest request);

    @Headers({
        "Authorization: Bearer pat_MLV34Er7REuA1og5WIGfq1LKzZdNDdYLZlkISChL9e12PaVoifTBKGiTR47rmUcu",
        "Content-Type: application/json"
    })
    @GET("v3/chat/message/list")
    Call<CozeMessageResponse> getMessages(@Query("chat_id") String chatId, @Query("conversation_id") String conversationId);
}

/**
 * Coze API请求数据模型 (v3格式)
 */
class CozeApiRequest {
    private String bot_id;
    private String user_id;
    private boolean stream;
    private boolean auto_save_history;
    private AdditionalMessage[] additional_messages;

    public static class AdditionalMessage {
        private String role;
        private String content;
        private String content_type;

        public AdditionalMessage(String role, String content, String contentType) {
            this.role = role;
            this.content = content;
            this.content_type = contentType;
        }

        // Getters
        public String getRole() { return role; }
        public String getContent() { return content; }
        public String getContent_type() { return content_type; }
    }

    public CozeApiRequest(String botId, String userId, String message, boolean stream) {
        this.bot_id = botId;
        this.user_id = userId;
        this.stream = stream;
        this.auto_save_history = true;
        this.additional_messages = new AdditionalMessage[]{
            new AdditionalMessage("user", message, "text")
        };
    }

    // Getters
    public String getBot_id() { return bot_id; }
    public String getUser_id() { return user_id; }
    public boolean isStream() { return stream; }
    public boolean isAuto_save_history() { return auto_save_history; }
    public AdditionalMessage[] getAdditional_messages() { return additional_messages; }
}

/**
 * Coze API响应数据模型 (v3格式)
 */
class CozeApiResponse {
    private int code;
    private String msg;
    private Data data;

    public static class Data {
        private String id; // chat_id
        private String conversation_id;
        private String status;

        // Getters
        public String getId() { return id; }
        public String getConversation_id() { return conversation_id; }
        public String getStatus() { return status; }
    }

    // Getters
    public int getCode() { return code; }
    public String getMsg() { return msg; }
    public Data getData() { return data; }
}

/**
 * Coze API消息响应数据模型
 */
class CozeMessageResponse {
    private int code;
    private String msg;
    private MessageData[] data;

    public static class MessageData {
        private String id;
        private String conversation_id;
        private String role;
        private String type;
        private String content;
        private String status;

        // Getters
        public String getId() { return id; }
        public String getConversation_id() { return conversation_id; }
        public String getRole() { return role; }
        public String getType() { return type; }
        public String getContent() { return content; }
        public String getStatus() { return status; }
    }

    // Getters
    public int getCode() { return code; }
    public String getMsg() { return msg; }
    public MessageData[] getData() { return data; }
}
