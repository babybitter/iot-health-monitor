package com.lingshu.smart.monitor.ui.home;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;

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

import java.util.ArrayList;
import java.util.List;

public class HomeFragment extends Fragment implements OnDeviceToggleListener {

    private FragmentHomeBinding binding;
    private SmartDeviceAdapter deviceAdapter;
    private List<SmartDevice> smartDevices;

    public View onCreateView(@NonNull LayoutInflater inflater,
                             ViewGroup container, Bundle savedInstanceState) {
        HomeViewModel homeViewModel =
                new ViewModelProvider(this).get(HomeViewModel.class);

        binding = FragmentHomeBinding.inflate(inflater, container, false);
        View root = binding.getRoot();

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