package com.lingshu.smart.monitor.ui.home;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.navigation.Navigation;
import androidx.recyclerview.widget.GridLayoutManager;

import com.lingshu.smart.monitor.R;
import com.lingshu.smart.monitor.databinding.FragmentHomeBinding;
import com.lingshu.smart.monitor.adapter.SmartDeviceAdapter;
import com.lingshu.smart.monitor.adapter.OnDeviceToggleListener;
import com.lingshu.smart.monitor.data.SmartDevice;
import com.lingshu.smart.monitor.utils.ThemeManager;

import java.util.ArrayList;
import java.util.List;

public class HomeFragment extends Fragment implements OnDeviceToggleListener {

    private FragmentHomeBinding binding;
    private SmartDeviceAdapter deviceAdapter;
    private List<SmartDevice> smartDevices;
    private ThemeManager themeManager;
    private ImageView themeToggleButton;

    public View onCreateView(@NonNull LayoutInflater inflater,
                             ViewGroup container, Bundle savedInstanceState) {
        HomeViewModel homeViewModel =
                new ViewModelProvider(this).get(HomeViewModel.class);

        binding = FragmentHomeBinding.inflate(inflater, container, false);
        View root = binding.getRoot();

        // 初始化主题管理器
        themeManager = new ThemeManager(requireContext());

        // 初始化主题切换按钮
        initThemeToggle();

        // 初始化智能设备
        initSmartDevices();

        // 初始化环境数据
        initEnvironmentData();

        // 初始化人体数据
        initBodyData();

        return root;
    }

    private void initSmartDevices() {
        // 创建智能设备列表
        smartDevices = new ArrayList<>();
        smartDevices.add(new SmartDevice("灯光", R.drawable.ic_light_bulb, true));
        smartDevices.add(new SmartDevice("警报", R.drawable.ic_alarm, false));
        smartDevices.add(new SmartDevice("加湿器", R.drawable.ic_humidifier, false));
        smartDevices.add(new SmartDevice("风扇", R.drawable.ic_fan, false));

        // 设置RecyclerView
        deviceAdapter = new SmartDeviceAdapter(smartDevices, this);
        binding.smartDevicesRecyclerView.setLayoutManager(new GridLayoutManager(getContext(), 2));
        binding.smartDevicesRecyclerView.setAdapter(deviceAdapter);
    }

    private void initEnvironmentData() {
        // 设置环境数据
        binding.lightValue.setText("1200 lux");
        binding.pressureValue.setText("1013 hPa");
        binding.temperatureValue.setText("24°C");
        binding.humidityValue.setText("65%");
    }

    private void initBodyData() {
        // 设置人体监测数据
        binding.breathingRateValue.setText("18 次/分");
        binding.heartRateValue.setText("72 次/分");
        binding.bloodOxygenValue.setText("98%");
        binding.bodyTemperatureValue.setText("36.5°C");
    }

    /**
     * 初始化主题切换按钮
     */
    private void initThemeToggle() {
        themeToggleButton = binding.themeToggleButton;
        updateThemeIcon();

        themeToggleButton.setOnClickListener(v -> showThemeSelectionDialog());
    }

    /**
     * 显示主题选择对话框
     */
    private void showThemeSelectionDialog() {
        View dialogView = getLayoutInflater().inflate(R.layout.dialog_theme_selection, null);
        RadioGroup themeRadioGroup = dialogView.findViewById(R.id.themeRadioGroup);
        RadioButton lightThemeRadio = dialogView.findViewById(R.id.lightThemeRadio);
        RadioButton darkThemeRadio = dialogView.findViewById(R.id.darkThemeRadio);
        RadioButton systemThemeRadio = dialogView.findViewById(R.id.systemThemeRadio);

        // 设置当前选中的主题
        int currentTheme = themeManager.getCurrentTheme();
        switch (currentTheme) {
            case ThemeManager.THEME_LIGHT:
                lightThemeRadio.setChecked(true);
                break;
            case ThemeManager.THEME_DARK:
                darkThemeRadio.setChecked(true);
                break;
            case ThemeManager.THEME_SYSTEM:
                systemThemeRadio.setChecked(true);
                break;
        }

        AlertDialog dialog = new AlertDialog.Builder(requireContext())
                .setView(dialogView)
                .create();

        // 设置对话框背景透明
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }

        // 设置单选按钮点击事件
        themeRadioGroup.setOnCheckedChangeListener((group, checkedId) -> {
            int selectedTheme;
            if (checkedId == R.id.lightThemeRadio) {
                selectedTheme = ThemeManager.THEME_LIGHT;
            } else if (checkedId == R.id.darkThemeRadio) {
                selectedTheme = ThemeManager.THEME_DARK;
            } else {
                selectedTheme = ThemeManager.THEME_SYSTEM;
            }

            applyThemeSelection(selectedTheme, dialog);
        });

        dialog.show();
    }

    /**
     * 应用主题选择
     */
    private void applyThemeSelection(int selectedTheme, AlertDialog dialog) {
        themeManager.setTheme(selectedTheme);
        updateThemeIcon();

        // 显示切换提示
        String themeName = themeManager.getThemeName(selectedTheme);
        Toast.makeText(getContext(), "已切换到" + themeName, Toast.LENGTH_SHORT).show();

        dialog.dismiss();
    }

    /**
     * 更新主题图标
     */
    private void updateThemeIcon() {
        int currentTheme = themeManager.getCurrentTheme();
        int iconRes;

        switch (currentTheme) {
            case ThemeManager.THEME_LIGHT:
                iconRes = R.drawable.ic_theme_light;
                break;
            case ThemeManager.THEME_DARK:
                iconRes = R.drawable.ic_theme_dark;
                break;
            case ThemeManager.THEME_SYSTEM:
                iconRes = R.drawable.ic_theme_system;
                break;
            default:
                iconRes = R.drawable.ic_theme_light;
                break;
        }

        themeToggleButton.setImageResource(iconRes);
    }

    @Override
    public void onDeviceToggle(int position, boolean isOn) {
        SmartDevice device = smartDevices.get(position);
        String status = isOn ? "开启" : "关闭";
        Toast.makeText(getContext(), device.getName() + "已" + status, Toast.LENGTH_SHORT).show();

        // 这里可以添加实际的设备控制逻辑
        // 例如发送网络请求到服务器控制设备
    }



    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}