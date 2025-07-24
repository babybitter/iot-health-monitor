package com.lingshu.smart.monitor.ui.detection;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

/**
 * 智能检测页面ViewModel
 */
public class DetectionViewModel extends ViewModel {

    private final MutableLiveData<String> mText;

    public DetectionViewModel() {
        mText = new MutableLiveData<>();
        mText.setValue("智能检测功能正在开发中...");
    }

    public LiveData<String> getText() {
        return mText;
    }
}
