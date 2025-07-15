// 监测历史记录页面
const app = getApp();
const apiClient = require('../../utils/api.js');
const { formatTimeHHMM } = require('../../utils/util.js');
const config = require('../../config/config.js');

Page({
  data: {
    // 导航栏高度
    navHeight: 0,
    statusBarHeight: 0,
    
    // 页面状态
    loading: false,
    error: '',
    hasData: false,
    
    // 时间范围
    timeRange: '',

    // 历史数据
    historyData: [],
    chartData: null,
    dataStats: null, // 数据统计信息

    // ECharts配置
    ec: {
      onInit: null // 将在onLoad中设置
    }
  },

  // 图表实例和状态
  chart: null,
  chartInitialized: false,

  onLoad(options) {
    console.log('历史图表页面加载');
    
    // 设置导航栏高度
    this.setNavBarHeight();
    
    // 检查登录状态
    if (!this.checkLoginStatus()) {
      return;
    }
    
    // 设置时间范围显示
    this.setTimeRange();
    
    // 初始化图表配置
    this.initChartConfig();
    
    // 先测试网络连接，再加载数据
    this.testNetworkAndLoadData();
  },

  onShow() {
    console.log('历史图表页面显示');

    // 如果图表已初始化但数据更新失败，尝试重新更新
    if (this.chart && this.chartInitialized && this.data.chartData && this.data.hasData) {
      setTimeout(() => {
        this.updateChart();
      }, 100);
    }
  },

  onHide() {
    console.log('历史图表页面隐藏');
  },

  onUnload() {
    console.log('历史图表页面卸载');

    // 清理图表实例
    if (this.chart) {
      try {
        this.chart.dispose();
      } catch (error) {
        console.error('图表销毁失败:', error);
      }
      this.chart = null;
    }
    this.chartInitialized = false;
  },

  // 设置导航栏高度
  setNavBarHeight() {
    const windowInfo = wx.getWindowInfo();
    const statusBarHeight = windowInfo.statusBarHeight;
    const navHeight = statusBarHeight + 44; // 44是导航栏内容高度

    this.setData({
      statusBarHeight: statusBarHeight,
      navHeight: navHeight
    });
  },

  // 检查登录状态
  checkLoginStatus() {
    // 使用与个人中心页面相同的存储键名
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.avatarUrl) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 2000);

      return false;
    }
    return true;
  },

  // 设置时间范围显示
  setTimeRange() {
    // 暂时显示所有可用数据
    const timeRange = `所有可用的历史数据`;
    this.setData({ timeRange });
  },

  // 初始化图表配置 - 使用懒加载模式
  initChartConfig() {
    this.setData({
      ec: {
        lazyLoad: true // 使用懒加载模式
      }
    });
  },

  // 懒加载模式下的图表初始化函数
  initChartWithData(chartData) {
    console.log('开始懒加载模式初始化图表，数据:', {
      timeLabels: chartData.timeLabels.length,
      seriesCount: Object.keys(chartData.series).length
    });

    // 获取图表组件实例
    const chartComponent = this.selectComponent("#history-chart");
    if (!chartComponent) {
      console.error('无法获取图表组件实例');
      return;
    }

    // 使用懒加载模式初始化图表
    chartComponent.init((canvas, width, height, dpr) => {
      console.log('懒加载图表初始化开始', { width, height, dpr });

      // 导入ECharts
      const echarts = require('../../ec-canvas/echarts');

      // 如果高度为0，设置默认高度
      if (height <= 0) {
        height = 400;
        console.log('检测到高度为0，设置默认高度:', height);
      }

      // 确保宽度也有合理值
      if (width <= 0) {
        width = 330;
        console.log('检测到宽度为0，设置默认宽度:', width);
      }

      console.log('最终图表尺寸:', { width, height, dpr });

      // 初始化图表实例
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr
      });

      console.log('ECharts实例创建成功:', !!chart);

      // 直接设置真实数据，不显示测试图表
      console.log('开始设置真实数据');
      const option = this.getChartOptionWithData(chartData);
      console.log('图表配置生成完成，数据点数量:', {
        xAxisDataLength: option.xAxis.data.length,
        seriesCount: option.series.length,
        firstSeriesDataLength: option.series[0].data.length
      });

      chart.setOption(option, true);
      console.log('真实数据配置设置完成');

      // 保存图表实例
      this.chart = chart;
      this.chartInitialized = true;

      console.log('懒加载图表初始化完成');

      // 返回图表实例
      return chart;
    });
  },

  // 图表初始化函数（保留用于兼容）
  initChart(canvas, width, height, dpr) {
    console.log('图表初始化开始', { width, height, dpr });

    try {
      // 导入ECharts
      const echarts = require('../../ec-canvas/echarts');

      // 验证ECharts是否正确加载
      if (!echarts || typeof echarts.init !== 'function') {
        throw new Error('ECharts库加载失败');
      }

      // 如果高度为0，设置默认高度
      if (height <= 0) {
        height = 400; // 设置默认高度为400px
        console.log('检测到高度为0，设置默认高度:', height);
      }

      // 初始化图表实例
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr
      });

      // 验证图表实例是否创建成功
      if (!chart) {
        throw new Error('图表实例创建失败');
      }

      // 设置canvas的chart引用（参考官方demo）
      canvas.setChart(chart);

      // 保存图表实例以便后续更新
      this.chart = chart;
      this.chartInitialized = true;

      console.log('图表初始化成功，最终尺寸:', { width, height, dpr });

      // 延迟设置初始配置，确保图表完全初始化
      setTimeout(() => {
        if (this.chart && this.chartInitialized) {
          console.log('开始设置基础图表配置');

          // 设置基础图表配置选项（不包含数据）
          const option = this.getChartOption();
          this.chart.setOption(option, true); // true表示不合并，完全替换
          console.log('基础图表配置设置完成');

          // 强制重绘
          this.chart.resize();

          // 如果已有数据，更新图表
          if (this.data.chartData) {
            console.log('检测到已有数据，准备更新图表');
            setTimeout(() => {
              this.updateChart();
            }, 100); // 增加延迟时间
          } else {
            console.log('暂无数据，等待数据加载');
          }
        }
      }, 200); // 增加延迟时间

      return chart;
    } catch (error) {
      console.error('图表初始化失败:', error);
      this.chartInitialized = false;

      // 设置错误状态
      this.setData({
        error: '图表初始化失败: ' + error.message
      });

      return null;
    }
  },

  // 测试网络连接并加载数据
  async testNetworkAndLoadData() {
    console.log('开始测试网络连接');

    try {
      // 先测试健康检查接口
      const healthResult = await apiClient.healthCheck();
      console.log('健康检查结果:', healthResult);

      if (healthResult && healthResult.success) {
        console.log('网络连接正常，开始加载数据');
        this.loadData();
      } else {
        throw new Error('服务器健康检查失败');
      }
    } catch (error) {
      console.error('网络连接测试失败:', error);
      this.setData({
        loading: false,
        hasData: false,
        error: `网络连接失败: ${error.message}。请检查网络设置或在微信开发者工具中关闭域名校验。`
      });
    }
  },

  // 加载历史数据
  async loadData() {
    console.log('开始加载历史数据');
    this.setData({ loading: true, error: '', hasData: false });

    try {
      // 计算时间范围（最近24小时）
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      console.log('时间范围:', {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });

      console.log('准备调用API:', `${config.api.baseUrl}/api/history/default_device`);

      // 调用API获取历史数据（暂时去掉时间范围限制进行测试）
      const result = await apiClient.getHistoryData('default_device', {
        limit: 100
        // startTime: startTime.toISOString(),
        // endTime: endTime.toISOString()
      });

      console.log('API返回结果:', result);
      console.log('数据长度:', result.data ? result.data.length : 'undefined');
      console.log('数据内容:', result.data);

      // 验证API响应格式
      if (!result || typeof result !== 'object') {
        throw new Error('API响应格式错误');
      }

      if (result.success && result.data && result.data.length > 0) {
        // 处理和格式化数据
        const processedData = this.processHistoryData(result.data);
        const statsData = this.calculateDataStats(result.data);

        this.setData({
          loading: false,
          hasData: true,
          historyData: result.data,
          chartData: processedData,
          dataStats: statsData
        });

        console.log('数据已设置到页面状态，准备初始化图表');

        // 使用懒加载模式初始化图表
        setTimeout(() => {
          this.initChartWithData(processedData);
        }, 100);

        console.log('数据加载成功，共', result.data.length, '条记录');
      } else if (result.success && result.data && result.data.length === 0) {
        // 数据为空的情况
        this.setData({
          loading: false,
          hasData: false,
          error: '最近24小时内暂无监测数据'
        });
      } else {
        // API调用失败的情况
        const errorMsg = result.error || '获取数据失败，请稍后重试';
        this.setData({
          loading: false,
          hasData: false,
          error: errorMsg
        });
      }
    } catch (error) {
      console.error('加载历史数据失败:', error);
      this.setData({
        loading: false,
        hasData: false,
        error: error.message || '网络连接失败，请检查网络设置'
      });
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 处理历史数据，为图表渲染准备数据
  processHistoryData(rawData) {
    console.log('开始处理历史数据，原始数据条数:', rawData.length);

    if (!rawData || rawData.length === 0) {
      return null;
    }

    // 按时间排序（从早到晚）
    const sortedData = rawData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // 提取时间标签和各类数据
    const timeLabels = [];
    const temperatureData = [];
    const humidityData = [];
    const lightData = [];
    const pressureData = [];
    const breathingData = [];
    const heartRateData = [];
    const bloodOxygenData = [];

    sortedData.forEach(item => {
      // 格式化时间为HH:mm
      const time = new Date(item.created_at);
      timeLabels.push(formatTimeHHMM(time));

      // 处理各类数据，过滤null/undefined值
      temperatureData.push(this.filterValue(item.temp || item.temperature));
      humidityData.push(this.filterValue(item.humi || item.humidity));
      lightData.push(this.filterValue(item.light || item.light_intensity));
      pressureData.push(this.filterValue(item.pressure));
      breathingData.push(this.filterValue(item.breathing || item.breathing_rate));
      heartRateData.push(this.filterValue(item.heart_rate));
      bloodOxygenData.push(this.filterValue(item.spo2 || item.blood_oxygen));
    });

    const processedData = {
      timeLabels,
      series: {
        temperature: temperatureData,
        humidity: humidityData,
        light: lightData,
        pressure: pressureData,
        breathing: breathingData,
        heartRate: heartRateData,
        bloodOxygen: bloodOxygenData
      }
    };

    console.log('数据处理完成:', {
      timeLabels: timeLabels.length,
      dataPoints: {
        temperature: temperatureData.filter(v => v !== null).length,
        humidity: humidityData.filter(v => v !== null).length,
        light: lightData.filter(v => v !== null).length,
        pressure: pressureData.filter(v => v !== null).length,
        breathing: breathingData.filter(v => v !== null).length,
        heartRate: heartRateData.filter(v => v !== null).length,
        bloodOxygen: bloodOxygenData.filter(v => v !== null).length
      }
    });

    return processedData;
  },

  // 过滤无效值
  filterValue(value) {
    if (value === null || value === undefined || value === '' || isNaN(value)) {
      return null;
    }
    return parseFloat(value);
  },

  // 计算数据统计信息
  calculateDataStats(rawData) {
    if (!rawData || rawData.length === 0) {
      return null;
    }

    const stats = {
      totalRecords: rawData.length,
      timeSpan: {
        start: new Date(rawData[0].created_at),
        end: new Date(rawData[rawData.length - 1].created_at)
      },
      dataTypes: {
        temperature: 0,
        humidity: 0,
        light: 0,
        pressure: 0,
        breathing: 0,
        heartRate: 0,
        bloodOxygen: 0
      }
    };

    // 统计各类数据的有效记录数
    rawData.forEach(item => {
      if (this.filterValue(item.temp || item.temperature) !== null) stats.dataTypes.temperature++;
      if (this.filterValue(item.humi || item.humidity) !== null) stats.dataTypes.humidity++;
      if (this.filterValue(item.light || item.light_intensity) !== null) stats.dataTypes.light++;
      if (this.filterValue(item.pressure) !== null) stats.dataTypes.pressure++;
      if (this.filterValue(item.breathing || item.breathing_rate) !== null) stats.dataTypes.breathing++;
      if (this.filterValue(item.heart_rate) !== null) stats.dataTypes.heartRate++;
      if (this.filterValue(item.spo2 || item.blood_oxygen) !== null) stats.dataTypes.bloodOxygen++;
    });

    console.log('数据统计:', stats);
    return stats;
  },

  // 获取图表配置选项
  getChartOption() {
    return {
      title: {
        text: '监测历史记录（最近1小时）',
        left: 'center',
        textStyle: {
          fontSize: 16,
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        },
        formatter: function (params) {
          let result = params[0].name + '<br/>';
          params.forEach(function (item) {
            if (item.value !== null && item.value !== undefined) {
              result += item.marker + ' ' + item.seriesName + ': ' + item.value + '<br/>';
            }
          });
          return result;
        }
      },
      legend: {
        data: ['温度(°C)', '湿度(%)', '光照(lux)', '气压(hPa)', '呼吸(次/分)', '心率(次/分)', '血氧(%)'],
        top: 30,
        textStyle: {
          fontSize: 12
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '8%',
        top: 80,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: [], // 将在updateChart中设置
        axisLabel: {
          fontSize: 10,
          color: '#666'
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          color: '#666'
        },
        splitLine: {
          lineStyle: {
            color: '#f0f0f0'
          }
        }
      },
      series: [
        {
          name: '温度(°C)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#e74c3c',
            width: 2
          },
          itemStyle: {
            color: '#e74c3c'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0, color: 'rgba(231, 76, 60, 0.3)'
              }, {
                offset: 1, color: 'rgba(231, 76, 60, 0.1)'
              }]
            }
          },
          data: [] // 将在updateChart中设置
        },
        {
          name: '湿度(%)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#3498db',
            width: 2
          },
          itemStyle: {
            color: '#3498db'
          },
          data: []
        },
        {
          name: '光照(lux)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#f39c12',
            width: 2
          },
          itemStyle: {
            color: '#f39c12'
          },
          data: []
        },
        {
          name: '气压(hPa)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#9b59b6',
            width: 2
          },
          itemStyle: {
            color: '#9b59b6'
          },
          data: []
        },
        {
          name: '呼吸(次/分)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#2ecc71',
            width: 2
          },
          itemStyle: {
            color: '#2ecc71'
          },
          data: []
        },
        {
          name: '心率(次/分)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#e67e22',
            width: 2
          },
          itemStyle: {
            color: '#e67e22'
          },
          data: []
        },
        {
          name: '血氧(%)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#1abc9c',
            width: 2
          },
          itemStyle: {
            color: '#1abc9c'
          },
          data: []
        }
      ]
    };
  },

  // 更新图表数据
  updateChart() {
    console.log('开始更新图表数据');

    // 检查图表实例和数据
    if (!this.chart) {
      console.log('图表实例不存在，跳过更新');
      return false;
    }

    if (!this.chartInitialized) {
      console.log('图表未正确初始化，跳过更新');
      return false;
    }

    if (!this.data.chartData) {
      console.log('图表数据不存在，跳过更新');
      return false;
    }

    try {
      const chartData = this.data.chartData;
      console.log('更新图表数据:', {
        timeLabels: chartData.timeLabels.length,
        seriesData: Object.keys(chartData.series).map(key => ({
          name: key,
          length: chartData.series[key].length,
          validCount: chartData.series[key].filter(v => v !== null).length
        }))
      });

      // 验证数据完整性
      if (!chartData.timeLabels || chartData.timeLabels.length === 0) {
        throw new Error('时间标签数据为空');
      }

      // 获取完整的图表配置选项并填入数据
      const option = this.getChartOptionWithData(chartData);

      // 使用完整的option更新图表，确保图表正确渲染
      this.chart.setOption(option, true); // true表示不合并，完全替换

      // 强制重绘图表
      this.chart.resize();

      console.log('图表数据更新完成');
      return true;
    } catch (error) {
      console.error('图表数据更新失败:', error);

      // 设置错误状态
      this.setData({
        error: '图表渲染失败: ' + error.message
      });

      return false;
    }
  },

  // 获取包含数据的完整图表配置选项
  getChartOptionWithData(chartData) {
    return {
      title: {
        text: '监测历史记录（最近1小时）',
        left: 'center',
        textStyle: {
          fontSize: 16,
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        },
        formatter: function (params) {
          let result = params[0].name + '<br/>';
          params.forEach(function (item) {
            if (item.value !== null && item.value !== undefined) {
              result += item.marker + ' ' + item.seriesName + ': ' + item.value + '<br/>';
            }
          });
          return result;
        }
      },
      legend: {
        data: ['温度(°C)', '湿度(%)', '光照(lux)', '气压(hPa)', '呼吸(次/分)', '心率(次/分)', '血氧(%)'],
        top: 30,
        textStyle: {
          fontSize: 12
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '8%',
        top: 80,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: chartData.timeLabels,
        axisLabel: {
          fontSize: 10,
          color: '#666'
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          color: '#666'
        },
        splitLine: {
          lineStyle: {
            color: '#f0f0f0'
          }
        }
      },
      series: [
        {
          name: '温度(°C)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#e74c3c',
            width: 2
          },
          itemStyle: {
            color: '#e74c3c'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0, color: 'rgba(231, 76, 60, 0.3)'
              }, {
                offset: 1, color: 'rgba(231, 76, 60, 0.1)'
              }]
            }
          },
          data: chartData.series.temperature
        },
        {
          name: '湿度(%)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#3498db',
            width: 2
          },
          itemStyle: {
            color: '#3498db'
          },
          data: chartData.series.humidity
        },
        {
          name: '光照(lux)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#f39c12',
            width: 2
          },
          itemStyle: {
            color: '#f39c12'
          },
          data: chartData.series.light
        },
        {
          name: '气压(hPa)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#9b59b6',
            width: 2
          },
          itemStyle: {
            color: '#9b59b6'
          },
          data: chartData.series.pressure
        },
        {
          name: '呼吸(次/分)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#2ecc71',
            width: 2
          },
          itemStyle: {
            color: '#2ecc71'
          },
          data: chartData.series.breathing
        },
        {
          name: '心率(次/分)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#e67e22',
            width: 2
          },
          itemStyle: {
            color: '#e67e22'
          },
          data: chartData.series.heartRate
        },
        {
          name: '血氧(%)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#1abc9c',
            width: 2
          },
          itemStyle: {
            color: '#1abc9c'
          },
          data: chartData.series.bloodOxygen
        }
      ]
    };
  },

  // 重新初始化图表
  retryChart() {
    console.log('重新初始化图表');

    // 重置图表状态
    this.chart = null;
    this.chartInitialized = false;

    // 重新设置图表配置
    this.setData({
      ec: {
        onInit: this.initChart.bind(this)
      },
      error: ''
    });
  },

  // 重新加载数据
  retryLoad() {
    console.log('重新加载数据');

    // 清除错误状态
    this.setData({
      error: '',
      loading: false,
      hasData: false
    });

    // 重新加载数据
    this.loadData();
  }
});
