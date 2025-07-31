package com.lingshu.smart.monitor.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.lingshu.smart.monitor.R
import com.lingshu.smart.monitor.data.model.ChatMessage
import com.lingshu.smart.monitor.data.model.MessageRole
import com.lingshu.smart.monitor.utils.MarkdownUtils

/**
 * 聊天消息适配器
 */
class ChatMessageAdapter(
    private val messages: MutableList<ChatMessage>
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    companion object {
        private const val VIEW_TYPE_USER = 1
        private const val VIEW_TYPE_ASSISTANT = 2
    }

    override fun getItemViewType(position: Int): Int {
        return when (messages[position].role) {
            MessageRole.USER -> VIEW_TYPE_USER
            MessageRole.ASSISTANT -> VIEW_TYPE_ASSISTANT
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return when (viewType) {
            VIEW_TYPE_USER -> {
                val view = LayoutInflater.from(parent.context)
                    .inflate(R.layout.item_message_user, parent, false)
                UserMessageViewHolder(view)
            }
            VIEW_TYPE_ASSISTANT -> {
                val view = LayoutInflater.from(parent.context)
                    .inflate(R.layout.item_message_assistant, parent, false)
                AssistantMessageViewHolder(view)
            }
            else -> throw IllegalArgumentException("Unknown view type: $viewType")
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val message = messages[position]
        when (holder) {
            is UserMessageViewHolder -> holder.bind(message)
            is AssistantMessageViewHolder -> holder.bind(message)
        }
    }

    override fun getItemCount(): Int = messages.size

    /**
     * 添加新消息
     */
    fun addMessage(message: ChatMessage) {
        messages.add(message)
        notifyItemInserted(messages.size - 1)
    }

    /**
     * 更新流式消息内容
     */
    fun updateStreamingMessage(messageId: String, content: String, isComplete: Boolean) {
        val index = messages.indexOfFirst { it.id == messageId }
        if (index != -1) {
            val message = messages[index]
            messages[index] = message.copy(content = content, isStreaming = !isComplete)
            notifyItemChanged(index)
        }
    }

    /**
     * 清空所有消息
     */
    fun clearMessages() {
        val size = messages.size
        messages.clear()
        notifyItemRangeRemoved(0, size)
    }

    /**
     * 用户消息ViewHolder
     */
    class UserMessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val messageText: TextView = itemView.findViewById(R.id.tvMessageText)
        private val messageTime: TextView = itemView.findViewById(R.id.tvMessageTime)

        fun bind(message: ChatMessage) {
            messageText.text = message.content
            messageTime.text = message.getFormattedTime()
        }
    }

    /**
     * AI助手消息ViewHolder
     */
    class AssistantMessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val messageText: TextView = itemView.findViewById(R.id.tvMessageText)
        private val messageTime: TextView = itemView.findViewById(R.id.tvMessageTime)
        private val streamingIndicator: View = itemView.findViewById(R.id.streamingIndicator)

        fun bind(message: ChatMessage) {
            // 检查是否包含Markdown语法，如果包含则使用Markdown渲染
            val hasMarkdown = MarkdownUtils.containsMarkdown(message.content)

            // 调试日志
            android.util.Log.d("ChatAdapter", "Message content: ${message.content}")
            android.util.Log.d("ChatAdapter", "Has markdown: $hasMarkdown")

            if (hasMarkdown) {
                MarkdownUtils.setMarkdownText(messageText, message.content)
            } else {
                messageText.text = message.content
            }

            messageTime.text = message.getFormattedTime()
            streamingIndicator.visibility = if (message.isStreaming) View.VISIBLE else View.GONE
        }
    }
}
