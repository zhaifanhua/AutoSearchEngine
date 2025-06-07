// 搜索引擎配置
const SEARCH_ENGINES = {
  google: {
    name: "Google",
    url: "https://www.google.com/search?q={query}",
    icon: "🔍",
    color: "#4285f4",
    suggest:
      "https://suggestqueries.google.com/complete/search?client=chrome&q={query}",
    pagination: "&start={page}0",
  },
  baidu: {
    name: "百度",
    url: "https://www.baidu.com/s?wd={query}",
    icon: "🔎",
    color: "#2932e1",
    suggest:
      "https://suggestion.baidu.com/su?wd={query}&cb=window.baiduSuggest",
    pagination: "&pn={page}0",
  },
  bing: {
    name: "Bing",
    url: "https://www.bing.com/search?q={query}",
    icon: "🌐",
    color: "#0078d4",
    suggest: "https://api.bing.com/qsonhs.aspx?q={query}",
    pagination: "&first={page}1",
  },
  duckduckgo: {
    name: "DuckDuckGo",
    url: "https://duckduckgo.com/?q={query}",
    icon: "🦆",
    color: "#de5833",
    suggest: "https://duckduckgo.com/ac/?q={query}",
  },
  sogou: {
    name: "搜狗",
    url: "https://www.sogou.com/web?query={query}",
    icon: "🔎",
    color: "#ff6900",
    suggest: "https://w.sugg.sogou.com/sugg/ajaj_json.jsp?key={query}",
  },
  so360: {
    name: "360搜索",
    url: "https://www.so.com/s?q={query}",
    icon: "🔍",
    color: "#00d05d",
    suggest: "https://sug.so.360.cn/suggest?word={query}",
  },
  yandex: {
    name: "Yandex",
    url: "https://yandex.com/search/?text={query}",
    icon: "🔍",
    color: "#ffcc00",
    suggest: "https://suggest.yandex.com/suggest-ff.cgi?part={query}",
  },
  yahoo: {
    name: "Yahoo",
    url: "https://search.yahoo.com/search?p={query}",
    icon: "🔍",
    color: "#720e9e",
    suggest:
      "https://search.yahoo.com/sugg/gossip/gossip-us-ura/?output=sd1&command={query}",
  },
  github: {
    name: "GitHub",
    url: "https://github.com/search?q={query}",
    icon: "📁",
    color: "#333",
    suggest: null,
  },
  stackoverflow: {
    name: "Stack Overflow",
    url: "https://stackoverflow.com/search?q={query}",
    icon: "📚",
    color: "#f48024",
    suggest: null,
  },
  wikipedia: {
    name: "Wikipedia",
    url: "https://zh.wikipedia.org/wiki/Special:Search?search={query}",
    icon: "📖",
    color: "#000",
    suggest:
      "https://zh.wikipedia.org/w/api.php?action=opensearch&search={query}",
  },
  zhihu: {
    name: "知乎",
    url: "https://www.zhihu.com/search?type=content&q={query}",
    icon: "🧠",
    color: "#0084ff",
    suggest: null,
  },
  bilibili: {
    name: "Bilibili",
    url: "https://search.bilibili.com/all?keyword={query}",
    icon: "📺",
    color: "#fb7299",
    suggest: null,
  },
};

// 默认设置
const DEFAULT_SETTINGS = {
  currentEngine: "google",
  enabledEngines: Object.keys(SEARCH_ENGINES),
  showSuggestions: true,
  maxSuggestions: 8,
  saveHistory: true,
  maxHistoryItems: 100,
  enableContextMenu: true,
  enableKeyboardShortcuts: true,
  openInNewTab: true,
  theme: "light",
};

// 主题配置
const THEMES = {
  light: {
    name: "浅色主题",
    background: "#ffffff",
    text: "#333333",
    border: "#e0e0e0",
    hover: "#f5f5f5",
    primary: "#007bff",
  },
  dark: {
    name: "深色主题",
    background: "#2d2d2d",
    text: "#ffffff",
    border: "#444444",
    hover: "#404040",
    primary: "#0d7377",
  },
  auto: {
    name: "跟随系统",
    background: "var(--bg-color)",
    text: "var(--text-color)",
    border: "var(--border-color)",
    hover: "var(--hover-color)",
    primary: "var(--primary-color)",
  },
};

// 导出配置（如果在模块环境中）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SEARCH_ENGINES,
    DEFAULT_SETTINGS,
    THEMES,
  };
}

// 在浏览器环境中挂载到window对象
if (typeof window !== "undefined") {
  window.SEARCH_ENGINES = SEARCH_ENGINES;
  window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  window.THEMES = THEMES;
}
