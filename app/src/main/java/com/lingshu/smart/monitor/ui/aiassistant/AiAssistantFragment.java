package com.lingshu.smart.monitor.ui.aiassistant;

import android.os.Bundle;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.lingshu.smart.monitor.HealthMonitorApplication;
import com.lingshu.smart.monitor.adapter.ChatMessageAdapter;
import com.lingshu.smart.monitor.data.model.ChatMessage;
import com.lingshu.smart.monitor.data.model.ChatHealthData;
import com.lingshu.smart.monitor.data.model.HealthMetric;
import com.lingshu.smart.monitor.data.model.HealthStatus;
import com.lingshu.smart.monitor.data.model.MessageRole;
import com.lingshu.smart.monitor.databinding.FragmentAiAssistantBinding;
import com.lingshu.smart.monitor.network.AiAssistantManager;

import java.util.ArrayList;

/**
 * AI助手页面
 * 提供智能健康咨询和建议
 */
public class AiAssistantFragment extends Fragment {

    private FragmentAiAssistantBinding binding;
    private AiAssistantViewModel viewModel;
    private ChatMessageAdapter messageAdapter;
    private AiAssistantManager aiAssistantManager;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             ViewGroup container, Bundle savedInstanceState) {

        binding = FragmentAiAssistantBinding.inflate(inflater, container, false);
        View root = binding.getRoot();

        // 初始化ViewModel
        viewModel = new ViewModelProvider(this).get(AiAssistantViewModel.class);

        // 获取AI助手管理器
        HealthMonitorApplication app = (HealthMonitorApplication) requireActivity().getApplication();
        aiAssistantManager = app.appContainer.getAiAssistantManager();

        // 初始化UI
        initializeUI();

        // 设置观察者
        setupObservers();

        // 初始化健康数据
        initializeHealthData();

        return root;
    }

    private void initializeUI() {
        // 设置RecyclerView
        messageAdapter = new ChatMessageAdapter(new ArrayList<>());
        LinearLayoutManager layoutManager = new LinearLayoutManager(getContext());
        layoutManager.setStackFromEnd(true); // 从底部开始显示
        binding.recyclerViewMessages.setLayoutManager(layoutManager);
        binding.recyclerViewMessages.setAdapter(messageAdapter);

        // 设置点击事件
        binding.fabSend.setOnClickListener(v -> sendMessage());
        binding.btnDataAnalysis.setOnClickListener(v -> requestDataAnalysis());
        binding.btnHealthAdvice.setOnClickListener(v -> requestHealthAdvice());
        binding.btnEmergencyHelp.setOnClickListener(v -> showEmergencyHelp());

        // 新增的输入框功能按钮
        binding.btnVoiceInput.setOnClickListener(v -> startVoiceInput());
        binding.btnEmoji.setOnClickListener(v -> showEmojiPanel());
        binding.btnAttachment.setOnClickListener(v -> showAttachmentOptions());

        // 设置输入框回车发送
        binding.editTextMessage.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == android.view.inputmethod.EditorInfo.IME_ACTION_SEND) {
                sendMessage();
                return true;
            }
            return false;
        });

        // 监听输入框文本变化
        binding.editTextMessage.addTextChangedListener(new android.text.TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                updateInputHint(s.length() > 0);
            }

            @Override
            public void afterTextChanged(android.text.Editable s) {}
        });
    }

    private void setupObservers() {
        // 观察健康数据变化
        viewModel.getHealthData().observe(getViewLifecycleOwner(), this::updateHealthDataDisplay);

        // 观察消息发送状态
        viewModel.getIsLoading().observe(getViewLifecycleOwner(), isLoading -> {
            binding.fabSend.setEnabled(!isLoading);
            // 可以添加加载指示器
        });
    }

    private void initializeHealthData() {
        // 初始化模拟健康数据
        ChatHealthData healthData = new ChatHealthData(
            new HealthMetric("72", HealthStatus.NORMAL, "次/分"),
            new HealthMetric("98", HealthStatus.NORMAL, "%"),
            new HealthMetric("36.5", HealthStatus.NORMAL, "°C"),
            new HealthMetric("18", HealthStatus.NORMAL, "次/分"),
            new HealthMetric("24", HealthStatus.NORMAL, "°C"),
            new HealthMetric("65", HealthStatus.NORMAL, "%"),
            new HealthMetric("1200", HealthStatus.NORMAL, "lux"),
            new HealthMetric("1013", HealthStatus.NORMAL, "hPa")
        );
        viewModel.updateHealthData(healthData);
    }

    private void updateHealthDataDisplay(ChatHealthData healthData) {
        if (healthData != null) {
            if (healthData.getHeartRate() != null) {
                binding.heartRateDisplay.setText(healthData.getHeartRate().getValue());
            }
            if (healthData.getBloodOxygen() != null) {
                binding.bloodOxygenDisplay.setText(healthData.getBloodOxygen().getValue() + "%");
            }
            if (healthData.getBodyTemperature() != null) {
                binding.temperatureDisplay.setText(healthData.getBodyTemperature().getValue() + "°C");
            }
            // 注意：新布局中没有呼吸频率显示，所以移除这个引用
        }
    }

    private void sendMessage() {
        String messageText = binding.editTextMessage.getText().toString().trim();
        if (TextUtils.isEmpty(messageText)) {
            return;
        }

        // 清空输入框
        binding.editTextMessage.setText("");

        // 添加用户消息
        ChatMessage userMessage = new ChatMessage(
            "user_" + System.currentTimeMillis(),
            MessageRole.USER,
            messageText,
            System.currentTimeMillis(),
            false
        );
        messageAdapter.addMessage(userMessage);
        scrollToBottom();

        // 发送到AI
        sendToAI(messageText);
    }

    private void sendToAI(String message) {
        viewModel.setLoading(true);

        // 创建AI消息占位符
        String aiMessageId = "ai_" + System.currentTimeMillis();
        ChatMessage aiMessage = new ChatMessage(
            aiMessageId,
            MessageRole.ASSISTANT,
            "",
            System.currentTimeMillis(),
            true
        );
        messageAdapter.addMessage(aiMessage);
        scrollToBottom();

        // 调用AI接口 - 真实Coze API (Java版本)
        aiAssistantManager.sendMessage(
            message,
            viewModel.getHealthData().getValue(),
            (content, isComplete) -> {
                // 更新流式消息
                requireActivity().runOnUiThread(() -> {
                    messageAdapter.updateStreamingMessage(aiMessageId, content, isComplete);
                    if (content.length() % 20 == 0 || isComplete) {
                        scrollToBottom();
                    }
                    if (isComplete) {
                        viewModel.setLoading(false);
                    }
                });
            },
            (error) -> {
                // 错误处理
                requireActivity().runOnUiThread(() -> {
                    messageAdapter.updateStreamingMessage(aiMessageId,
                        "抱歉，发生了错误：" + error.getMessage(), true);
                    viewModel.setLoading(false);
                    Toast.makeText(getContext(), "发送失败：" + error.getMessage(),
                        Toast.LENGTH_SHORT).show();
                });
            }
        );
    }

    private void requestDataAnalysis() {
        String analysisMessage = "请分析我当前的健康监测数据和环境数据，评估环境因素对我健康的影响，给出专业的健康评估和环境调节建议。";

        // 添加用户消息
        ChatMessage userMessage = new ChatMessage(
            "user_analysis_" + System.currentTimeMillis(),
            MessageRole.USER,
            "数据分析",
            System.currentTimeMillis(),
            false
        );
        messageAdapter.addMessage(userMessage);
        scrollToBottom();

        // 发送到AI
        sendToAI(analysisMessage);
    }

    private void requestHealthAdvice() {
        String adviceMessage = "根据我的健康监测数据和环境数据，请给我一些日常健康建议、环境调节建议和注意事项。";

        // 添加用户消息
        ChatMessage userMessage = new ChatMessage(
            "user_advice_" + System.currentTimeMillis(),
            MessageRole.USER,
            "健康建议",
            System.currentTimeMillis(),
            false
        );
        messageAdapter.addMessage(userMessage);
        scrollToBottom();

        // 发送到AI
        sendToAI(adviceMessage);
    }

    private void showEmergencyHelp() {
        new androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle("紧急情况")
            .setMessage("如遇紧急情况，请立即拨打急救电话：120\n\n或联系您的主治医生")
            .setPositiveButton("拨打120", (dialog, which) -> {
                try {
                    android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_CALL);
                    intent.setData(android.net.Uri.parse("tel:120"));
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(getContext(), "无法拨打电话", Toast.LENGTH_SHORT).show();
                }
            })
            .setNegativeButton("取消", null)
            .show();
    }

    private void scrollToBottom() {
        if (messageAdapter.getItemCount() > 0) {
            binding.recyclerViewMessages.smoothScrollToPosition(messageAdapter.getItemCount() - 1);
        }
    }

    /**
     * 启动语音输入
     */
    private void startVoiceInput() {
        try {
            android.content.Intent intent = new android.content.Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, "zh-CN");
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_PROMPT, "请说出您的健康问题");

            startActivityForResult(intent, 100);
        } catch (Exception e) {
            Toast.makeText(getContext(), "语音输入不可用", Toast.LENGTH_SHORT).show();
        }
    }

    /**
     * 显示表情面板
     */
    private void showEmojiPanel() {
        // 简单的表情选择
        String[] emojis = {"😊", "😷", "🤒", "💊", "🏥", "❤️", "👍", "🙏"};

        new androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle("选择表情")
            .setItems(emojis, (dialog, which) -> {
                String currentText = binding.editTextMessage.getText().toString();
                binding.editTextMessage.setText(currentText + emojis[which]);
                binding.editTextMessage.setSelection(binding.editTextMessage.getText().length());
            })
            .show();
    }

    /**
     * 显示附件选项
     */
    private void showAttachmentOptions() {
        String[] options = {"拍照", "从相册选择", "健康报告", "取消"};

        new androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle("选择附件类型")
            .setItems(options, (dialog, which) -> {
                switch (which) {
                    case 0:
                        Toast.makeText(getContext(), "拍照功能开发中", Toast.LENGTH_SHORT).show();
                        break;
                    case 1:
                        Toast.makeText(getContext(), "相册功能开发中", Toast.LENGTH_SHORT).show();
                        break;
                    case 2:
                        Toast.makeText(getContext(), "健康报告功能开发中", Toast.LENGTH_SHORT).show();
                        break;
                }
            })
            .show();
    }

    /**
     * 更新输入提示
     */
    private void updateInputHint(boolean hasText) {
        if (hasText) {
            binding.tvInputHint.setText("按回车键或点击发送按钮发送消息");
        } else {
            binding.tvInputHint.setText("AI助手正在为您提供专业的健康建议");
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, android.content.Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == 100 && resultCode == getActivity().RESULT_OK && data != null) {
            java.util.ArrayList<String> results = data.getStringArrayListExtra(
                android.speech.RecognizerIntent.EXTRA_RESULTS);
            if (results != null && !results.isEmpty()) {
                binding.editTextMessage.setText(results.get(0));
                binding.editTextMessage.setSelection(binding.editTextMessage.getText().length());
            }
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
