package com.lingshu.smart.monitor.ui.detection;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.lingshu.smart.monitor.databinding.FragmentDetectionBinding;

/**
 * 智能检测页面
 * 提供各种健康检测功能
 */
public class DetectionFragment extends Fragment {

    private FragmentDetectionBinding binding;

    public View onCreateView(@NonNull LayoutInflater inflater,
                             ViewGroup container, Bundle savedInstanceState) {
        DetectionViewModel detectionViewModel =
                new ViewModelProvider(this).get(DetectionViewModel.class);

        binding = FragmentDetectionBinding.inflate(inflater, container, false);
        View root = binding.getRoot();

        final TextView textView = binding.textDetection;
        detectionViewModel.getText().observe(getViewLifecycleOwner(), textView::setText);
        return root;
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
