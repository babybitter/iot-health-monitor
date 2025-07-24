package com.lingshu.smart.monitor.ui.profile;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

/**
 * 个人中心页面ViewModel
 */
public class ProfileViewModel extends ViewModel {

    private final MutableLiveData<String> mText;

    public ProfileViewModel() {
        mText = new MutableLiveData<>();
        mText.setValue("个人中心 - 用户信息管理");
    }

    public LiveData<String> getText() {
        return mText;
    }
}
