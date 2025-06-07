// API配置文件
// 注意：实际使用时请替换为您自己的API密钥

const API_CONFIG = {
  // Google Custom Search API
  google: {
    enabled: false, // 设置为true并填入密钥后启用
    apiKey: "YOUR_GOOGLE_API_KEY", // 从 https://developers.google.com/custom-search/v1/introduction 获取
    searchEngineId: "YOUR_CUSTOM_SEARCH_ENGINE_ID", // 从 https://cse.google.com/ 创建
    endpoint: "https://www.googleapis.com/customsearch/v1",
    rateLimit: 100, // 每天请求限制
  },

  // Bing Web Search API
  bing: {
    enabled: false, // 设置为true并填入密钥后启用
    apiKey: "YOUR_BING_API_KEY", // 从 https://azure.microsoft.com/en-us/services/cognitive-services/bing-web-search-api/ 获取
    endpoint: "https://api.bing.microsoft.com/v7.0/search",
    rateLimit: 1000, // 每月请求限制
  },

  // DuckDuckGo Instant Answer API（免费，无需密钥）
  duckduckgo: {
    enabled: true,
    apiKey: null,
    endpoint: "https://api.duckduckgo.com/",
    rateLimit: null, // 无官方限制，但建议适度使用
  },

  // Wikipedia API（免费，无需密钥）
  wikipedia: {
    enabled: true,
    apiKey: null,
    endpoint: "https://zh.wikipedia.org/w/api.php",
    rateLimit: null, // 无官方限制，但建议适度使用
  },

  // 搜狗搜索建议API（部分功能）
  sogou: {
    enabled: false,
    apiKey: null,
    endpoint: "https://w.sugg.sogou.com/sugg/ajaj_json.jsp",
    rateLimit: null,
  },

  // 百度搜索建议API（部分功能）
  baidu: {
    enabled: false,
    apiKey: null,
    endpoint: "https://suggestion.baidu.com/su",
    rateLimit: null,
  },
};

// 获取API配置
function getAPIConfig(engineId) {
  return API_CONFIG[engineId] || null;
}

// 检查API是否可用
function isAPIEnabled(engineId) {
  const config = getAPIConfig(engineId);
  return config && config.enabled && (config.apiKey || config.apiKey === null);
}

// 构建API URL
function buildAPIUrl(engineId, query, page = 1) {
  const config = getAPIConfig(engineId);
  if (!config || !config.enabled) {
    throw new Error(`${engineId} API未启用或未配置`);
  }

  const encodedQuery = encodeURIComponent(query);

  switch (engineId) {
    case "google":
      return `${config.endpoint}?key=${config.apiKey}&cx=${
        config.searchEngineId
      }&q=${encodedQuery}&start=${(page - 1) * 10 + 1}`;

    case "bing":
      return `${config.endpoint}?q=${encodedQuery}&offset=${
        (page - 1) * 10
      }&count=10`;

    case "duckduckgo":
      return `${config.endpoint}?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;

    case "wikipedia":
      return `${config.endpoint}?action=opensearch&search=${encodedQuery}&format=json&origin=*&limit=10`;

    case "sogou":
      return `${config.endpoint}?key=${encodedQuery}&type=web`;

    case "baidu":
      return `${config.endpoint}?wd=${encodedQuery}&cb=jsonp&_=${Date.now()}`;

    default:
      throw new Error(`不支持的搜索引擎: ${engineId}`);
  }
}

// 获取需要的请求头
function getAPIHeaders(engineId) {
  const config = getAPIConfig(engineId);
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  };

  // 为特定API添加必要的头部
  switch (engineId) {
    case "bing":
      if (config.apiKey && config.apiKey !== "YOUR_BING_API_KEY") {
        headers["Ocp-Apim-Subscription-Key"] = config.apiKey;
      }
      break;
  }

  return headers;
}

// 导出配置
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    API_CONFIG,
    getAPIConfig,
    isAPIEnabled,
    buildAPIUrl,
    getAPIHeaders,
  };
}

// 在浏览器环境中挂载到window对象
if (typeof window !== "undefined") {
  window.API_CONFIG = API_CONFIG;
  window.getAPIConfig = getAPIConfig;
  window.isAPIEnabled = isAPIEnabled;
  window.buildAPIUrl = buildAPIUrl;
  window.getAPIHeaders = getAPIHeaders;
}
