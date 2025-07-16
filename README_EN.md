# 🏥 IoT Patient Health Monitoring System

An intelligent health monitoring system based on ESP32-S3 hardware and WeChat Mini Program, enabling real-time physiological data collection and remote monitoring capabilities.

## 🌐 Language / 语言

- [🇨🇳 中文版](README.md)
- [🇺🇸 English](README_EN.md)

## 📱 System Interface Display

<div align="center">
  <table>
    <tr>
      <td align="center" width="33%">
        <img src="images/index-display-image.png" width="200" alt="Home Interface"/>
        <br/>
        <b>Home Monitoring</b>
        <br/>
        <sub>Real-time Physiological Monitoring</sub>
      </td>
      <td align="center" width="33%">
        <img src="images/smart-monitor-display-image.png" width="200" alt="Smart Infusion Monitoring Interface"/>
        <br/>
        <b>Smart Infusion Monitoring</b>
        <br/>
        <sub>Real-time Infusion Animation Monitoring</sub>
      </td>
      <td align="center" width="33%">
        <img src="images/profile-display-image.png" width="200" alt="Profile Interface"/>
        <br/>
        <b>User Profile</b>
        <br/>
        <sub>User Information Management</sub>
      </td>
    </tr>
  </table>
</div>

### 🏠 Home Monitoring Interface

Real-time display of patient's key physiological indicators and environmental data:

**Human Health Indicators:**
- 🫁 **Breathing Rate** - Breaths per minute
- ❤️ **Heart Rate Monitoring** - Real-time heart rate
- 🩸 **Blood Oxygen Saturation** - Real-time SpO2 monitoring

**Environmental Monitoring Data:**
- 🌡️ **Environmental Temperature** - Accurate to 0.1°C
- 💧 **Environmental Humidity** - Real-time humidity tracking
- ☀️ **Light Intensity** - Environmental light monitoring
- 🌪️ **Atmospheric Pressure** - Real-time atmospheric pressure tracking

**Device Control:**
- 💡 **Device Control** - LED lighting and buzzer control

### 💧 Smart Infusion Monitoring

Professional infusion monitoring features:

**Real-time Animation Monitoring:**
- 🧪 **3D Infusion Bottle Animation** - High-precision 24-frame liquid animation, real-time liquid changes
- 🌊 **Wave Effects** - Natural liquid surface wave animation for enhanced visual realism
- ✨ **Highlight Reflection** - Bottle glass highlights and liquid surface reflection effects
- 🎭 **Shadow Rendering** - 3D shadow effects for enhanced visual depth
- 💧 **Infusion Tube Animation** - Droplet animation simulating real infusion process

**Data Monitoring:**
- ⚖️ **Weight Monitoring** - Real-time display of initial weight, current weight, and remaining percentage
- � **Smart Calculation** - Automatic calculation of remaining liquid percentage and warning thresholds
- 🚨 **Low Liquid Warning** - Automatic buzzer warning when liquid is insufficient
- � **Infusion Speed** - Real-time monitoring of infusion drip rate (drops/minute)
- 📈 **Status Assessment** - Intelligent assessment of infusion speed status (normal/slow/fast)

**MQTT Data Support:**
- � **patient/monitor/weight-begin** - Receive initial weight data
- 📡 **patient/monitor/weight** - Receive real-time weight data
- 📡 **patient/monitor/infusion-speed** - Receive infusion speed data
- 🔄 **Data Format Compatibility** - Support for both string and numeric data format parsing

### 👤 User Profile

User management features:

- � **Login Verification** - Login required before accessing sensitive functions
- 👤 **Patient Information** - Personal profile management
- �‍⚕️ **Doctor Information** - Attending physician contact details
- 👨‍👩‍👧‍👦 **Family Contacts** - Emergency contact management
- 📊 **Monitoring History** - View historical data chart analysis
- ⚙️ **System Settings** - Personalized configuration options

**Security Features:**
- Unauthorized users attempting to access sensitive functions will be prompted to login first
- Login status is persistently saved and automatically restored after app restart
- Support one-click logout to clear all local user data

### 📊 Monitoring History

Professional historical data visualization features:

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ESP32-S3      │    │   Backend       │    │   WeChat Mini   │
│   Hardware      │◄──►│   Node.js API   │◄──►│   Program       │
│   Sensors       │    │   Server        │    │   Frontend      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
    ┌────▼────┐             ┌────▼────┐
    │  MQTT   │             │  MySQL  │
    │ Message │             │Database │
    │  Queue  │             │         │
    └─────────┘             └─────────┘
```

## 🚀 Core Features

### 📊 Real-time Data Monitoring

- **Multi-sensor Support**: Temperature, humidity, breathing, blood oxygen and other physiological indicators
- **Real-time Data Transmission**: Low-latency data transmission based on MQTT protocol
- **Historical Data Storage**: Complete monitoring history stored in MySQL database
- **Data Visualization**: Real-time charts and trend analysis

### 📊 Health Data Analysis

- **Health Data Assessment**: Comprehensive health evaluation based on collected data
- **Anomaly Detection**: Automatic identification of physiological indicator abnormalities
- **Personalized Recommendations**: Customized health advice based on user data
- **Real-time Consultation**: 24/7 health consultation service

### 🔧 Device Control

- **Remote Control**: Control hardware devices through mini program
- **Status Monitoring**: Real-time display of device operating status
- **Automated Control**: Intelligent control based on sensor data

### 👥 User Management

- **Multi-role Support**: Different permissions for patients, doctors, and family members
- **Information Management**: Complete user profiles and contact information
- **Access Control**: Role-based data access control

## 🛠️ Technology Stack

### Frontend Technologies

- **WeChat Mini Program**: Native mini program development framework
- **WXML/WXSS**: Mini program markup language and styles
- **JavaScript**: ES6+ syntax, modular development
- **WeUI**: Official WeChat UI component library

### Backend Technologies

- **Node.js**: Server runtime environment
- **Express.js**: Web application framework
- **MySQL**: Relational database
- **MQTT**: IoT message transmission protocol

### Hardware Technologies

- **ESP32-S3**: Main control chip
- **WiFi**: Wireless network connection
- **Sensors**: DHT22 (temperature/humidity), MAX30102 (blood oxygen), etc.
- **Actuators**: LED lights, buzzers, etc.

## 📁 Project Structure

```
LoTProject/
├── 📱 Frontend Mini Program
│   ├── pages/                 # Page files
│   │   ├── index/            # Home monitoring interface
│   │   ├── smart-monitor/    # Smart infusion monitoring
│   │   ├── profile/          # User profile
│   │   ├── patient-info/     # Patient information
│   │   ├── doctor-info/      # Doctor information
│   │   ├── family-contact/   # Family contacts
│   │   └── history/          # Monitoring history
│   ├── utils/                # Utility functions
│   │   ├── mqtt.js          # MQTT communication
│   │   └── util.js          # Common utilities
│   ├── images/              # Image resources
│   ├── config/              # Configuration files
│   ├── app.js              # Mini program entry
│   └── app.json            # Mini program configuration
├── 🖥️ Backend Service
│   ├── server/
│   │   ├── app.js          # Server entry
│   │   ├── config/         # Database configuration
│   │   └── sql/            # SQL scripts
│   └── database/           # Database files
├── 📜 Script Tools
│   └── scripts/            # Deployment and startup scripts
└── 📚 Documentation
    ├── README.md           # Project documentation (Chinese)
    ├── README_EN.md        # Project documentation (English)
    └── package.json        # Dependency configuration
```

## ⚙️ Environment Configuration

### System Requirements

- **Node.js**: >= 16.0.0
- **MySQL**: >= 5.7
- **WeChat Developer Tools**: Latest version
- **ESP32-S3 Development Board**: WiFi support required

### Environment Variables Configuration

Create `.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=iot_monitor

# MQTT Configuration
MQTT_HOST=your_mqtt_broker
MQTT_PORT=1883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
```

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-username/iot-health-monitor.git
cd iot-health-monitor
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Initialization

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE iot_monitor;"

# Import database structure
mysql -u root -p iot_monitor < database/init.sql
```

### 4. Start Backend Service

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 5. Configure Mini Program

1. Open project with WeChat Developer Tools
2. Configure server domain (disable domain verification for development)
3. Compile and preview

## 📊 API Interfaces

### Sensor Data Interfaces

```javascript
// Receive hardware data
POST /api/sensor-data
{
  "device_id": "esp32_001",
  "temp": 36.5,
  "humi": 65.0,
  "breathing": 18,
  "spo2": 98
}

// Get latest data
GET /api/latest/:deviceId

// Get historical data
GET /api/history/:deviceId?limit=50&page=1
```

### System Status Interfaces

```javascript
// Health check
GET /api/health

// Device status
GET /api/device-status/:deviceId
```

### New Topic Data Interfaces

```javascript
// Get device upload data
GET /api/device-upload/:deviceId?limit=50&page=1

// Get device advice records
GET /api/device-advice/:deviceId?limit=50&page=1

// Get vital temperature data
GET /api/vital-temperature/:deviceId?limit=50&page=1
```

## 🔧 Hardware Data Format

The system is fully compatible with ESP32-S3 hardware data format:

### Physiological Monitoring Data
```json
{
  "device_id": "data_send_test_01",
  "temp": 37.2, // Temperature (°C)
  "humi": 65.5, // Humidity (%)
  "breathing": 18, // Breathing rate (breaths/min)
  "spo2": 97, // Blood oxygen saturation (%)
  "heart": 72 // Heart rate (bpm, reserved)
}
```

### Smart Infusion Monitoring Data
```json
{
  "device_id": "infusion_monitor_01",
  "weight": {
    "initial": 500, // Initial weight (g)
    "current": 350, // Current weight (g)
    "remaining_percentage": 70 // Remaining percentage (%)
  },
  "infusion_rate": 25, // Drip rate (drops/minute)
  "status": "normal", // Status: normal/warning/danger
  "alert_threshold": 50 // Warning threshold (g)
}
```

### New MQTT Topics Data Format

#### Data Upload Topic (`patient/upload/data`)
For device proactive business data reporting:
```json
{
  "device_id": "esp32_monitor_01",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "sensor_type": "multi_sensor",
    "values": {
      "temperature": 36.8,
      "humidity": 62.3,
      "pressure": 1013.25
    }
  }
}
```

#### Device Advice Topic (`patient/advice/device`)
For sending advice to devices:
```json
{
  "device_id": "esp32_monitor_01",
  "advice_type": "health_recommendation",
  "advice": {
    "message": "Recommend increasing indoor ventilation",
    "priority": "medium",
    "action": "ventilation_control"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Vital Temperature Channel (`patient/upload/data/temperature`)
Dedicated high-priority channel for temperature data:
```json
{
  "device_id": "esp32_monitor_01",
  "temperature": 37.5,
  "timestamp": "2024-01-15T10:30:00Z",
  "data_source": "vital_channel",
  "measurement_location": "forehead"
}
```

---

⭐ If this project helps you, please give us a star!
