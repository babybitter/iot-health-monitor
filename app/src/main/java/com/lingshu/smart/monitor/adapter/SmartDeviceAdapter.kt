package com.lingshu.smart.monitor.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.Switch
import android.widget.TextView
import androidx.cardview.widget.CardView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.lingshu.smart.monitor.R
import com.lingshu.smart.monitor.data.SmartDevice

class SmartDeviceAdapter(
    private val devices: MutableList<SmartDevice>,
    private val onDeviceToggle: OnDeviceToggleListener
) : RecyclerView.Adapter<SmartDeviceAdapter.DeviceViewHolder>() {

    class DeviceViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val deviceCard: CardView = view.findViewById(R.id.deviceCard)
        val deviceIcon: ImageView = view.findViewById(R.id.deviceIcon)
        val deviceName: TextView = view.findViewById(R.id.deviceName)
        val deviceSwitch: Switch = view.findViewById(R.id.deviceSwitch)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DeviceViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_smart_device, parent, false)
        return DeviceViewHolder(view)
    }

    override fun onBindViewHolder(holder: DeviceViewHolder, position: Int) {
        val device = devices[position]
        
        holder.deviceName.text = device.name
        holder.deviceIcon.setImageResource(device.iconRes)
        holder.deviceSwitch.isChecked = device.isOn
        
        // 根据开关状态设置卡片样式
        updateCardStyle(holder, device.isOn)
        
        // 设置开关监听器
        holder.deviceSwitch.setOnCheckedChangeListener { _, isChecked ->
            device.isOn = isChecked
            updateCardStyle(holder, isChecked)
            onDeviceToggle.onDeviceToggle(position, isChecked)
        }
    }

    private fun updateCardStyle(holder: DeviceViewHolder, isOn: Boolean) {
        val context = holder.itemView.context
        if (isOn) {
            // 开启状态：深色背景
            holder.deviceCard.setCardBackgroundColor(
                ContextCompat.getColor(context, R.color.device_on_background)
            )
            holder.deviceName.setTextColor(
                ContextCompat.getColor(context, android.R.color.white)
            )
            holder.deviceIcon.setColorFilter(
                ContextCompat.getColor(context, android.R.color.white)
            )
        } else {
            // 关闭状态：浅色背景
            holder.deviceCard.setCardBackgroundColor(
                ContextCompat.getColor(context, R.color.device_off_background)
            )
            holder.deviceName.setTextColor(
                ContextCompat.getColor(context, android.R.color.black)
            )
            holder.deviceIcon.setColorFilter(
                ContextCompat.getColor(context, R.color.device_icon_off)
            )
        }
    }

    override fun getItemCount() = devices.size
}
