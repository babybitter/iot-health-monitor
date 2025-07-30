package com.lingshu.smart.monitor.ui.aiassistant;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;
import com.lingshu.smart.monitor.data.model.ChatHealthData;

/**
 * AI助手页面ViewModel (简化Java版本)
 */
public class AiAssistantViewModel extends ViewModel {
    
    private static final String TAG = "AiAssistantViewModel";

    private final MutableLiveData<ChatHealthData> healthData = new MutableLiveData<>();
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);

    public LiveData<ChatHealthData> getHealthData() {
        return healthData;
    }

    public LiveData<Boolean> getIsLoading() {
        return isLoading;
    }

    public void updateHealthData(ChatHealthData data) {
        healthData.setValue(data);
    }

    public void setLoading(boolean loading) {
        isLoading.postValue(loading);
    }
}
