package com.lingshu.smart.monitor.ui.aiassistant;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

/**
 * AI助手页面ViewModel
 */
public class AiAssistantViewModel extends ViewModel {

    private final MutableLiveData<String> mText;

    public AiAssistantViewModel() {
        mText = new MutableLiveData<>();
        mText.setValue("AI健康助手为您服务");
    }

    public LiveData<String> getText() {
        return mText;
    }
}
