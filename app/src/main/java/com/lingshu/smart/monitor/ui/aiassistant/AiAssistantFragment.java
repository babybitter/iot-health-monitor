package com.lingshu.smart.monitor.ui.aiassistant;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.lingshu.smart.monitor.databinding.FragmentAiAssistantBinding;

/**
 * AI助手页面
 * 提供智能健康咨询和建议
 */
public class AiAssistantFragment extends Fragment {

    private FragmentAiAssistantBinding binding;

    public View onCreateView(@NonNull LayoutInflater inflater,
                             ViewGroup container, Bundle savedInstanceState) {
        AiAssistantViewModel aiAssistantViewModel =
                new ViewModelProvider(this).get(AiAssistantViewModel.class);

        binding = FragmentAiAssistantBinding.inflate(inflater, container, false);
        View root = binding.getRoot();

        final TextView textView = binding.textAiAssistant;
        aiAssistantViewModel.getText().observe(getViewLifecycleOwner(), textView::setText);
        return root;
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
