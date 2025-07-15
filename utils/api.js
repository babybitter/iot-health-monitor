// 统一API调用工具
const config = require("../config/config.js");

class ApiClient {
  constructor() {
    this.baseUrl = config.api.baseUrl;
  }

  // 通用HTTP请求方法
  request(url, options = {}) {
    const fullUrl = this.baseUrl + url;
    const defaultOptions = {
      method: 'GET',
      timeout: 30000, // 30秒超时
      header: {
        'Content-Type': 'application/json'
      }
    };

    const requestOptions = {
      ...defaultOptions,
      ...options,
      url: fullUrl
    };

    return new Promise((resolve, reject) => {
      wx.request({
        ...requestOptions,
        success: (res) => {
          console.log(`API请求成功 [${requestOptions.method}] ${url}:`, res);
          
          if (res.statusCode === 200) {
            // 检查响应数据结构
            if (!res.data) {
              reject(new Error("API响应数据为空"));
              return;
            }

            // 检查业务状态码
            if (res.data.success === false) {
              reject(new Error(res.data.error || "API调用失败"));
              return;
            }

            resolve(res.data);
          } else {
            reject(new Error(`HTTP错误: ${res.statusCode}`));
          }
        },
        fail: (error) => {
          console.error(`API请求失败 [${requestOptions.method}] ${url}:`, error);
          reject(new Error("网络连接失败"));
        }
      });
    });
  }

  // GET请求
  get(url, params = {}) {
    // 构建查询参数
    const queryString = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    return this.request(fullUrl, {
      method: 'GET'
    });
  }

  // POST请求
  post(url, data = {}) {
    return this.request(url, {
      method: 'POST',
      data: data
    });
  }

  // PUT请求
  put(url, data = {}) {
    return this.request(url, {
      method: 'PUT',
      data: data
    });
  }

  // DELETE请求
  delete(url) {
    return this.request(url, {
      method: 'DELETE'
    });
  }

  // 获取历史数据的专用方法
  getHistoryData(deviceId = 'default_device', options = {}) {
    const params = {
      limit: options.limit || 50,
      page: options.page || 1
    };

    // 添加时间范围参数
    if (options.startTime) {
      params.start_time = options.startTime;
    }
    if (options.endTime) {
      params.end_time = options.endTime;
    }

    console.log('getHistoryData调用参数:', { deviceId, options, params });
    return this.get(`/api/history/${deviceId}`, params);
  }

  // 获取最新数据的专用方法
  getLatestData(deviceId = 'default_device') {
    return this.get(`/api/latest/${deviceId}`);
  }

  // 健康检查
  healthCheck() {
    return this.get('/api/health');
  }
}

// 创建单例实例
const apiClient = new ApiClient();

module.exports = apiClient;
