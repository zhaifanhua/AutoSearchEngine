// 导入配置（实际使用时需要适配Chrome扩展的导入方式）
importScripts("js/config.js");

class SearchEngineManager {
  constructor() {
    this.init();
  }

  async init() {
    // 初始化存储
    await this.initStorage();

    // 创建右键菜单
    await this.createContextMenus();

    // 监听消息
    this.setupMessageListeners();

    // 监听快捷键
    this.setupCommandListeners();

    // 监听安装和更新
    this.setupInstallListener();
  }

  async initStorage() {
    const stored = await chrome.storage.sync.get();

    if (!stored.settings) {
      await chrome.storage.sync.set({
        settings: DEFAULT_SETTINGS,
        customEngines: {},
        searchHistory: [],
        favorites: [],
      });
    }
  }

  async createContextMenus() {
    // 清除已有菜单
    await chrome.contextMenus.removeAll();

    const settings = await this.getSettings();

    if (!settings.enableContextMenu) return;

    // 主菜单
    chrome.contextMenus.create({
      id: "search-with",
      title: '搜索 "%s"',
      contexts: ["selection"],
    });

    // 为每个启用的搜索引擎创建子菜单
    const enabledEngines =
      settings.enabledEngines || Object.keys(SEARCH_ENGINES);

    for (const engineId of enabledEngines) {
      const engine = SEARCH_ENGINES[engineId];
      if (engine) {
        chrome.contextMenus.create({
          id: `search-${engineId}`,
          parentId: "search-with",
          title: `${engine.icon} ${engine.name}`,
          contexts: ["selection"],
        });
      }
    }

    // 添加自定义搜索引擎
    const customEngines = await this.getCustomEngines();
    for (const [id, engine] of Object.entries(customEngines)) {
      chrome.contextMenus.create({
        id: `search-custom-${id}`,
        parentId: "search-with",
        title: `${engine.icon || "🔍"} ${engine.name}`,
        contexts: ["selection"],
      });
    }

    // 分隔符
    chrome.contextMenus.create({
      id: "separator",
      parentId: "search-with",
      type: "separator",
      contexts: ["selection"],
    });

    // 快速切换当前搜索引擎
    chrome.contextMenus.create({
      id: "switch-default",
      parentId: "search-with",
      title: "设为默认搜索引擎",
      contexts: ["selection"],
    });
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // 保持消息通道开放
    });

    // 监听右键菜单点击
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });
  }

  setupCommandListeners() {
    chrome.commands.onCommand.addListener((command) => {
      this.handleCommand(command);
    });
  }

  setupInstallListener() {
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === "install") {
        // 首次安装，打开欢迎页面
        chrome.tabs.create({
          url: chrome.runtime.getURL("welcome.html"),
        });
      } else if (details.reason === "update") {
        // 更新后的处理
        this.handleUpdate(details);
      }
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case "search":
          await this.performSearch(
            request.query,
            request.engine,
            request.openInNewTab
          );
          break;

        case "getSettings":
          const settings = await this.getSettings();
          sendResponse(settings);
          break;

        case "updateSettings":
          await this.updateSettings(request.settings);
          await this.createContextMenus(); // 重新创建菜单
          sendResponse({ success: true });
          break;

        case "addToHistory":
          await this.addToHistory(request.query, request.engine);
          break;

        case "getHistory":
          const history = await this.getHistory();
          sendResponse(history);
          break;

        case "clearHistory":
          await this.clearHistory();
          sendResponse({ success: true });
          break;

        case "getSuggestions":
          const suggestions = await this.getSuggestions(
            request.query,
            request.engine
          );
          sendResponse(suggestions);
          break;

        case "addCustomEngine":
          await this.addCustomEngine(request.engine);
          await this.createContextMenus();
          sendResponse({ success: true });
          break;

        case "removeCustomEngine":
          await this.removeCustomEngine(request.engineId);
          await this.createContextMenus();
          sendResponse({ success: true });
          break;

        case "getCustomEngines":
          const customEngines = await this.getCustomEngines();
          sendResponse(customEngines);
          break;

        case "addToFavorites":
          await this.addToFavorites(request.query, request.engine);
          sendResponse({ success: true });
          break;

        case "getFavorites":
          const favorites = await this.getFavorites();
          sendResponse(favorites);
          break;

        case "removeFavorite":
          await this.removeFavorite(request.index);
          sendResponse({ success: true });
          break;

        case "extractSearchResults":
          try {
            const results = await this.extractSearchResults(request.url);
            sendResponse({ success: true, results: results });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "fetchAPI":
          try {
            const data = await this.fetchAPIData(request.url, request.engineId);
            sendResponse({ success: true, data: data });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        default:
          sendResponse({ error: "Unknown action" });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ error: error.message });
    }
  }

  async handleContextMenuClick(info, tab) {
    const selectedText = info.selectionText;

    if (info.menuItemId.startsWith("search-custom-")) {
      const engineId = info.menuItemId.replace("search-custom-", "");
      const customEngines = await this.getCustomEngines();
      const engine = customEngines[engineId];
      if (engine) {
        await this.performSearch(selectedText, { custom: true, ...engine });
      }
    } else if (info.menuItemId.startsWith("search-")) {
      const engineId = info.menuItemId.replace("search-", "");
      const engine = SEARCH_ENGINES[engineId];
      if (engine) {
        await this.performSearch(selectedText, engineId);
      }
    } else if (info.menuItemId === "switch-default") {
      // 这里可以显示一个选择框来设置默认搜索引擎
      // 简化版本：使用当前选中的搜索引擎
      const settings = await this.getSettings();
      // 实际实现中可以记住最后使用的搜索引擎
    }
  }

  async handleCommand(command) {
    switch (command) {
      case "switch-search-engine":
        await this.switchSearchEngine();
        break;

      case "quick-search":
        await this.quickSearch();
        break;
    }
  }

  async performSearch(query, engine, openInNewTab = null) {
    if (!query) return;

    const settings = await this.getSettings();
    const shouldOpenInNewTab =
      openInNewTab !== null ? openInNewTab : settings.openInNewTab;

    let searchUrl;

    if (typeof engine === "string") {
      // 预定义搜索引擎
      const searchEngine = SEARCH_ENGINES[engine];
      if (!searchEngine) return;

      searchUrl = searchEngine.url.replace(
        "{query}",
        encodeURIComponent(query)
      );
    } else if (engine && engine.custom) {
      // 自定义搜索引擎
      searchUrl = engine.url.replace("{query}", encodeURIComponent(query));
    } else {
      return;
    }

    // 记录搜索历史
    if (settings.saveHistory) {
      await this.addToHistory(
        query,
        typeof engine === "string" ? engine : engine.name
      );
    }

    // 执行搜索
    if (shouldOpenInNewTab) {
      chrome.tabs.create({ url: searchUrl });
    } else {
      chrome.tabs.update({ url: searchUrl });
    }
  }

  async switchSearchEngine() {
    const settings = await this.getSettings();
    const engines = Object.keys(SEARCH_ENGINES);
    const currentIndex = engines.indexOf(settings.currentEngine);
    const nextIndex = (currentIndex + 1) % engines.length;
    const nextEngine = engines[nextIndex];

    await this.updateSettings({ ...settings, currentEngine: nextEngine });

    // 显示通知
    await this.showNotification(`已切换到 ${SEARCH_ENGINES[nextEngine].name}`);
  }

  async quickSearch() {
    // 获取当前标签页的选中文本
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => window.getSelection().toString(),
    });

    const selectedText = results[0].result;

    if (selectedText) {
      const settings = await this.getSettings();
      await this.performSearch(selectedText, settings.currentEngine);
    }
  }

  async getSettings() {
    const result = await chrome.storage.sync.get("settings");
    return result.settings || DEFAULT_SETTINGS;
  }

  async updateSettings(settings) {
    await chrome.storage.sync.set({ settings });
  }

  async addToHistory(query, engine) {
    const result = await chrome.storage.sync.get("searchHistory");
    let history = result.searchHistory || [];

    // 避免重复
    history = history.filter(
      (item) => !(item.query === query && item.engine === engine)
    );

    // 添加新记录
    history.unshift({
      query,
      engine,
      timestamp: Date.now(),
    });

    // 限制历史记录数量
    const settings = await this.getSettings();
    history = history.slice(0, settings.maxHistoryItems);

    await chrome.storage.sync.set({ searchHistory: history });
  }

  async getHistory() {
    const result = await chrome.storage.sync.get("searchHistory");
    return result.searchHistory || [];
  }

  async clearHistory() {
    await chrome.storage.sync.set({ searchHistory: [] });
  }

  async addToFavorites(query, engine) {
    const result = await chrome.storage.sync.get("favorites");
    let favorites = result.favorites || [];

    // 避免重复
    favorites = favorites.filter(
      (item) => !(item.query === query && item.engine === engine)
    );

    // 添加新记录
    favorites.unshift({
      query,
      engine,
      timestamp: Date.now(),
    });

    // 限制收藏数量
    favorites = favorites.slice(0, 100);

    await chrome.storage.sync.set({ favorites });
  }

  async getFavorites() {
    const result = await chrome.storage.sync.get("favorites");
    return result.favorites || [];
  }

  async removeFavorite(index) {
    const result = await chrome.storage.sync.get("favorites");
    let favorites = result.favorites || [];

    if (index >= 0 && index < favorites.length) {
      favorites.splice(index, 1);
      await chrome.storage.sync.set({ favorites });
    }
  }

  async getSuggestions(query, engine) {
    if (!query || query.length < 2) return [];

    const searchEngine = SEARCH_ENGINES[engine];
    if (!searchEngine || !searchEngine.suggest) return [];

    try {
      // 注意：实际实现中需要处理CORS问题
      // 这里只是示例，实际可能需要使用代理或者其他方法
      const response = await fetch(
        searchEngine.suggest.replace("{query}", encodeURIComponent(query))
      );
      const data = await response.json();

      // 不同搜索引擎的建议格式不同，需要分别处理
      return this.parseSuggestions(data, engine);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      return [];
    }
  }

  parseSuggestions(data, engine) {
    // 这里需要根据不同搜索引擎的API格式来解析建议
    // 简化版本，实际实现会更复杂
    try {
      switch (engine) {
        case "google":
          return data[1] || [];
        case "baidu":
          return data.s || [];
        default:
          return [];
      }
    } catch (error) {
      return [];
    }
  }

  async addCustomEngine(engine) {
    const result = await chrome.storage.sync.get("customEngines");
    const customEngines = result.customEngines || {};

    const id = Date.now().toString();
    customEngines[id] = engine;

    await chrome.storage.sync.set({ customEngines });
  }

  async removeCustomEngine(engineId) {
    const result = await chrome.storage.sync.get("customEngines");
    const customEngines = result.customEngines || {};

    delete customEngines[engineId];

    await chrome.storage.sync.set({ customEngines });
  }

  async getCustomEngines() {
    const result = await chrome.storage.sync.get("customEngines");
    return result.customEngines || {};
  }

  async fetchAPIData(url, engineId) {
    try {
      // 为不同的搜索引擎设置适当的请求头
      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      };

      // 为Bing API添加订阅密钥（如果有的话）
      if (engineId === "bing") {
        // 注意：实际使用时需要申请Bing Search API密钥
        // headers['Ocp-Apim-Subscription-Key'] = 'YOUR_BING_API_KEY';
      }

      const response = await fetch(url, {
        method: "GET",
        headers: headers,
        mode: "cors",
      });

      if (!response.ok) {
        throw new Error(
          `API请求失败: ${response.status} ${response.statusText}`
        );
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        // 对于某些API返回JSONP或其他格式的处理
        const text = await response.text();
        if (engineId === "duckduckgo" && text.includes("(")) {
          // DuckDuckGo API有时返回JSONP格式，需要提取JSON部分
          const jsonStart = text.indexOf("(") + 1;
          const jsonEnd = text.lastIndexOf(")");
          const jsonText = text.substring(jsonStart, jsonEnd);
          return JSON.parse(jsonText);
        }
        return { error: "无法解析API响应", rawText: text };
      }
    } catch (error) {
      console.error(`API获取失败 (${engineId}):`, error);
      throw new Error(`${engineId} API获取失败: ${error.message}`);
    }
  }

  async extractSearchResults(url) {
    try {
      // 创建新标签页来加载搜索结果
      const tab = await chrome.tabs.create({ url: url, active: false });

      // 等待页面加载完成
      await new Promise((resolve) => {
        const listener = (tabId, changeInfo) => {
          if (tabId === tab.id && changeInfo.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);

        // 设置超时
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }, 10000);
      });

      // 注入内容提取脚本
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          // 内联的内容提取逻辑
          const hostname = window.location.hostname;
          const results = [];

          // Google
          if (hostname.includes("google.com")) {
            const elements = document.querySelectorAll(".g, .tF2Cxc");
            elements.forEach((element, index) => {
              if (index >= 10) return;
              const titleElement = element.querySelector("h3, .LC20lb");
              const linkElement = element.querySelector("a[href]");
              const snippetElement = element.querySelector(
                ".VwiC3b, .s3v9rd, .st"
              );

              if (titleElement && linkElement) {
                results.push({
                  title: titleElement.textContent.trim(),
                  url: linkElement.href,
                  snippet: snippetElement
                    ? snippetElement.textContent.trim()
                    : "",
                });
              }
            });
          }
          // Baidu
          else if (hostname.includes("baidu.com")) {
            const elements = document.querySelectorAll(".result, .result-op");
            elements.forEach((element, index) => {
              if (index >= 10) return;
              const titleElement = element.querySelector("h3 a, .t a");
              const snippetElement = element.querySelector(
                ".c-abstract, .c-span9"
              );

              if (titleElement) {
                results.push({
                  title: titleElement.textContent.trim(),
                  url: titleElement.href,
                  snippet: snippetElement
                    ? snippetElement.textContent.trim()
                    : "",
                });
              }
            });
          }
          // Bing
          else if (hostname.includes("bing.com")) {
            const elements = document.querySelectorAll(".b_algo");
            elements.forEach((element, index) => {
              if (index >= 10) return;
              const titleElement = element.querySelector("h2 a");
              const snippetElement = element.querySelector(
                ".b_caption p, .b_snippet"
              );

              if (titleElement) {
                results.push({
                  title: titleElement.textContent.trim(),
                  url: titleElement.href,
                  snippet: snippetElement
                    ? snippetElement.textContent.trim()
                    : "",
                });
              }
            });
          }
          // 通用提取器
          else {
            const selectors = ["h3 a", "h2 a", ".result a", ".search-result a"];
            for (const selector of selectors) {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                elements.forEach((element, index) => {
                  if (index >= 10) return;
                  const title = element.textContent.trim();
                  const url = element.href;
                  if (title && url && !url.includes("javascript:")) {
                    results.push({ title, url, snippet: "" });
                  }
                });
                break;
              }
            }
          }

          return results;
        },
      });

      // 关闭标签页
      await chrome.tabs.remove(tab.id);

      return results[0].result || [];
    } catch (error) {
      console.error("提取搜索结果失败:", error);
      throw new Error("内容提取失败: " + error.message);
    }
  }

  async showNotification(message) {
    if (chrome.notifications) {
      await chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "搜索引擎切换器",
        message: message,
      });
    }
  }

  async handleUpdate(details) {
    // 处理插件更新
    console.log(
      "Extension updated from version",
      details.previousVersion,
      "to",
      chrome.runtime.getManifest().version
    );
  }
}

// 初始化
new SearchEngineManager();
