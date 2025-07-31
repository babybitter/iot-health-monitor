package com.lingshu.smart.monitor;

import android.os.Bundle;

import com.google.android.material.bottomnavigation.BottomNavigationView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.navigation.NavController;
import androidx.navigation.Navigation;
import androidx.navigation.ui.NavigationUI;

import com.lingshu.smart.monitor.databinding.ActivityMainBinding;
import com.lingshu.smart.monitor.utils.ThemeManager;

public class MainActivity extends AppCompatActivity {

    private ActivityMainBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 在设置内容视图之前应用主题
        ThemeManager themeManager = new ThemeManager(this);
        themeManager.applyTheme(themeManager.getCurrentTheme());

        super.onCreate(savedInstanceState);

        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        // 处理系统窗口插入，确保内容不被底部导航栏遮挡
        setupWindowInsets();

        BottomNavigationView navView = findViewById(R.id.nav_view);
        // Passing each menu ID as a set of Ids because each
        // menu should be considered as top level destinations.
        NavController navController = Navigation.findNavController(this, R.id.nav_host_fragment_activity_main);
        NavigationUI.setupWithNavController(binding.navView, navController);

        // 隐藏ActionBar标题
        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }
    }

    /**
     * 设置窗口插入处理，确保内容不被系统UI遮挡
     */
    private void setupWindowInsets() {
        // 设置全屏显示，让内容延伸到系统栏下方
        getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
        getWindow().getDecorView().setSystemUiVisibility(
            android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );

        // 处理窗口插入，为底部导航栏预留空间
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(binding.getRoot(),
            (v, insets) -> {
                androidx.core.graphics.Insets systemBars = insets.getInsets(
                    androidx.core.view.WindowInsetsCompat.Type.systemBars());

                // 为根布局设置顶部和底部间距
                v.setPadding(0, systemBars.top, 0, 0);

                return insets;
            });
    }

}