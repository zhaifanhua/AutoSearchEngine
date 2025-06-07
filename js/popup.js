class SearchEnginePopup {
  constructor() {
    this.currentSettings = null;
    this.currentEngine = "google";
    this.suggestionTimeout = null;
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    this.loadHistory();
    // 初始化主题
    this.initTheme();
  }

  initTheme() {
    // 使用全局主题管理器
    if (window.getThemeManager) {
      const themeManager = window.getThemeManager();
      if (themeManager) {
        themeManager.applyTheme();
      }
    }
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getSettings",
      });
      this.currentSettings = response || DEFAULT_SETTINGS;
      this.currentEngine = this.currentSettings.currentEngine;
    } catch (error) {
      console.error("Failed to load settings:", error);
      this.currentSettings = DEFAULT_SETTINGS;
    }
  }

  setupEventListeners() {
    // 搜索相关
    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");

    searchInput.addEventListener("input", () => this.handleSearchInput());
    searchInput.addEventListener("keydown", (e) => this.handleKeyDown(e));
    searchBtn.addEventListener("click", () => this.performSearch());

    // 收藏按钮点击
    const addToFavoritesBtn = document.getElementById("addToFavoritesBtn");
    addToFavoritesBtn?.addEventListener("click", () => {
      this.addCurrentSearchToFavorites();
    });

    // 搜索引擎切换
    const switchBtn = document.getElementById("switchBtn");
    switchBtn.addEventListener("click", () => this.showEngineSelector());

    // 设置按钮
    const settingsBtn = document.getElementById("settingsBtn");
    settingsBtn.addEventListener("click", () => this.openSettings());

    // 快速操作按钮
    const historyBtn = document.getElementById("historyBtn");
    const favoritesBtn = document.getElementById("favoritesBtn");
    const aggregateSearchBtn = document.getElementById("aggregateSearchBtn");
    const customEngineBtn = document.getElementById("customEngineBtn");

    historyBtn.addEventListener("click", () => this.showHistory());
    favoritesBtn.addEventListener("click", () => this.showFavorites());

    if (aggregateSearchBtn) {
      aggregateSearchBtn.addEventListener("click", () => {
        this.openAggregateSearch();
      });
    }

    customEngineBtn.addEventListener("click", () =>
      this.showCustomEngineForm()
    );

    // 引擎选择器
    const closeSelectorBtn = document.getElementById("closeSelectorBtn");
    closeSelectorBtn.addEventListener("click", () => this.hideEngineSelector());

    // 历史面板
    const closeHistoryBtn = document.getElementById("closeHistoryBtn");
    const clearHistoryBtn = document.getElementById("clearHistoryBtn");
    closeHistoryBtn.addEventListener("click", () => this.hideHistory());
    clearHistoryBtn.addEventListener("click", () => this.clearHistory());

    // 自定义引擎表单
    const closeFormBtn = document.getElementById("closeFormBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const saveEngineBtn = document.getElementById("saveEngineBtn");

    closeFormBtn.addEventListener("click", () => this.hideCustomEngineForm());
    cancelBtn.addEventListener("click", () => this.hideCustomEngineForm());
    saveEngineBtn.addEventListener("click", () => this.saveCustomEngine());

    // 全局点击事件
    document.addEventListener("click", (e) => this.handleGlobalClick(e));
  }

  updateUI() {
    this.updateCurrentEngine();
    this.generateEngineGrid();
  }

  updateCurrentEngine() {
    const engine = SEARCH_ENGINES[this.currentEngine];
    if (!engine) return;

    const engineIcon = document.querySelector(".current-engine .engine-icon");
    const engineName = document.querySelector(".current-engine .engine-name");

    if (engineIcon) engineIcon.textContent = engine.icon;
    if (engineName) engineName.textContent = engine.name;
  }

  generateEngineGrid() {
    const engineGrid = document.getElementById("engineGrid");
    if (!engineGrid) return;

    engineGrid.innerHTML = "";

    // 添加预定义搜索引擎
    const enabledEngines =
      this.currentSettings?.enabledEngines || Object.keys(SEARCH_ENGINES);

    for (const engineId of enabledEngines) {
      const engine = SEARCH_ENGINES[engineId];
      if (!engine) continue;

      const engineItem = document.createElement("div");
      engineItem.className = `engine-item ${
        engineId === this.currentEngine ? "active" : ""
      }`;
      engineItem.innerHTML = `
        <div class="icon">${engine.icon}</div>
        <div class="name">${engine.name}</div>
      `;

      engineItem.addEventListener("click", () => {
        this.selectEngine(engineId);
        this.hideEngineSelector();
      });

      engineGrid.appendChild(engineItem);
    }

    // 添加自定义搜索引擎
    this.loadCustomEngines();
  }

  async loadCustomEngines() {
    try {
      const customEngines = await chrome.runtime.sendMessage({
        action: "getCustomEngines",
      });
      const engineGrid = document.getElementById("engineGrid");

      for (const [id, engine] of Object.entries(customEngines || {})) {
        const engineItem = document.createElement("div");
        engineItem.className = "engine-item custom-engine";
        engineItem.innerHTML = `
          <div class="icon">${engine.icon || "🔍"}</div>
          <div class="name">${engine.name}</div>
          <div class="remove-btn" title="删除">×</div>
        `;

        engineItem.addEventListener("click", (e) => {
          if (e.target.classList.contains("remove-btn")) {
            this.removeCustomEngine(id);
          } else {
            this.selectCustomEngine(id, engine);
            this.hideEngineSelector();
          }
        });

        engineGrid.appendChild(engineItem);
      }
    } catch (error) {
      console.error("Failed to load custom engines:", error);
    }
  }

  handleSearchInput() {
    const query = document.getElementById("searchInput").value.trim();

    if (this.suggestionTimeout) {
      clearTimeout(this.suggestionTimeout);
    }

    if (query.length >= 2 && this.currentSettings?.showSuggestions) {
      this.suggestionTimeout = setTimeout(() => {
        this.loadSuggestions(query);
      }, 300);
    } else {
      this.hideSuggestions();
    }
  }

  async loadSuggestions(query) {
    try {
      const suggestions = await chrome.runtime.sendMessage({
        action: "getSuggestions",
        query: query,
        engine: this.currentEngine,
      });

      this.displaySuggestions(suggestions || []);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
    }
  }

  displaySuggestions(suggestions) {
    const suggestionsContainer = document.getElementById("suggestions");

    if (!suggestions.length) {
      this.hideSuggestions();
      return;
    }

    suggestionsContainer.innerHTML = "";

    suggestions
      .slice(0, this.currentSettings?.maxSuggestions || 8)
      .forEach((suggestion) => {
        const item = document.createElement("div");
        item.className = "suggestion-item";
        item.textContent = suggestion;

        item.addEventListener("click", () => {
          document.getElementById("searchInput").value = suggestion;
          this.performSearch();
          this.hideSuggestions();
        });

        suggestionsContainer.appendChild(item);
      });

    suggestionsContainer.style.display = "block";
  }

  hideSuggestions() {
    const suggestionsContainer = document.getElementById("suggestions");
    if (suggestionsContainer) {
      suggestionsContainer.style.display = "none";
    }
  }

  handleKeyDown(e) {
    if (e.key === "Enter") {
      this.performSearch();
    } else if (e.key === "Escape") {
      this.hideSuggestions();
    }
  }

  async performSearch() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) return;

    try {
      await chrome.runtime.sendMessage({
        action: "search",
        query: query,
        engine: this.currentEngine,
        openInNewTab: this.currentSettings?.openInNewTab,
      });

      // 关闭弹出窗口
      window.close();
    } catch (error) {
      console.error("Search failed:", error);
      this.showMessage("搜索失败，请重试");
    }
  }

  async addCurrentSearchToFavorites() {
    const query = document.getElementById("searchInput").value.trim();
    if (query) {
      await this.addToFavorites(query, this.currentEngine);
    }
  }

  selectEngine(engineId) {
    this.currentEngine = engineId;
    this.updateCurrentEngine();
    this.saveCurrentEngine();
  }

  selectCustomEngine(id, engine) {
    // 这里可以实现自定义搜索引擎的逻辑
    this.showMessage(`已选择自定义搜索引擎：${engine.name}`);
  }

  async saveCurrentEngine() {
    try {
      const newSettings = {
        ...this.currentSettings,
        currentEngine: this.currentEngine,
      };
      await chrome.runtime.sendMessage({
        action: "updateSettings",
        settings: newSettings,
      });
      this.currentSettings = newSettings;
    } catch (error) {
      console.error("Failed to save engine:", error);
    }
  }

  showEngineSelector() {
    document.getElementById("engineSelector").style.display = "flex";
  }

  hideEngineSelector() {
    document.getElementById("engineSelector").style.display = "none";
  }

  async showHistory() {
    try {
      const history = await chrome.runtime.sendMessage({
        action: "getHistory",
      });
      this.displayHistory(history || []);
      document.getElementById("historyPanel").style.display = "flex";
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }

  displayHistory(history) {
    const historyList = document.getElementById("historyList");
    historyList.innerHTML = "";

    if (!history.length) {
      historyList.innerHTML =
        '<div style="padding: 20px; text-align: center; color: #6c757d;">暂无搜索历史</div>';
      return;
    }

    history.forEach((item) => {
      const historyItem = document.createElement("div");
      historyItem.className = "history-item";

      const timeStr = new Date(item.timestamp).toLocaleString("zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      historyItem.innerHTML = `
        <div class="history-content">
          <div class="history-query">${item.query}</div>
          <div class="history-meta">
            <span class="history-engine">${
              SEARCH_ENGINES[item.engine]?.name || item.engine
            }</span>
            <span class="history-time">${timeStr}</span>
          </div>
        </div>
      `;

      historyItem.addEventListener("click", () => {
        document.getElementById("searchInput").value = item.query;
        this.currentEngine = item.engine;
        this.updateCurrentEngine();
        this.hideHistory();
      });

      historyList.appendChild(historyItem);
    });
  }

  hideHistory() {
    document.getElementById("historyPanel").style.display = "none";
  }

  async clearHistory() {
    if (confirm("确定要清空所有搜索历史吗？")) {
      try {
        await chrome.runtime.sendMessage({ action: "clearHistory" });
        this.displayHistory([]);
        this.showMessage("历史记录已清空");
      } catch (error) {
        console.error("Failed to clear history:", error);
      }
    }
  }

  async loadHistory() {
    // 预加载历史记录用于快速显示
    try {
      const history = await chrome.runtime.sendMessage({
        action: "getHistory",
      });
      // 可以在这里做一些预处理
    } catch (error) {
      console.error("Failed to preload history:", error);
    }
  }

  async showFavorites() {
    try {
      const favorites = await chrome.runtime.sendMessage({
        action: "getFavorites",
      });
      this.displayFavorites(favorites || []);
      document.getElementById("favoritesPanel").style.display = "flex";
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
  }

  displayFavorites(favorites) {
    // 创建收藏夹面板（如果不存在）
    let favoritesPanel = document.getElementById("favoritesPanel");
    if (!favoritesPanel) {
      favoritesPanel = this.createFavoritesPanel();
    }

    const favoritesList = document.getElementById("favoritesList");
    favoritesList.innerHTML = "";

    if (!favorites.length) {
      favoritesList.innerHTML =
        '<div style="padding: 20px; text-align: center; color: #6c757d;">暂无收藏的搜索</div>';
      return;
    }

    favorites.forEach((item, index) => {
      const favoriteItem = document.createElement("div");
      favoriteItem.className = "favorite-item";

      const timeStr = new Date(item.timestamp).toLocaleString("zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      favoriteItem.innerHTML = `
        <div class="favorite-content">
          <div class="favorite-query">${item.query}</div>
          <div class="favorite-meta">
            <span class="favorite-engine">${
              SEARCH_ENGINES[item.engine]?.name || item.engine
            }</span>
            <span class="favorite-time">${timeStr}</span>
          </div>
        </div>
        <button class="favorite-remove" data-index="${index}" title="取消收藏">★</button>
      `;

      favoriteItem.addEventListener("click", (e) => {
        if (!e.target.classList.contains("favorite-remove")) {
          document.getElementById("searchInput").value = item.query;
          this.currentEngine = item.engine;
          this.updateCurrentEngine();
          this.hideFavorites();
        }
      });

      favoriteItem
        .querySelector(".favorite-remove")
        .addEventListener("click", (e) => {
          e.stopPropagation();
          this.removeFavorite(index);
        });

      favoritesList.appendChild(favoriteItem);
    });
  }

  createFavoritesPanel() {
    const favoritesPanel = document.createElement("div");
    favoritesPanel.id = "favoritesPanel";
    favoritesPanel.className = "history-panel";
    favoritesPanel.style.display = "none";

    favoritesPanel.innerHTML = `
      <div class="panel-header">
        <span>收藏夹</span>
        <div class="panel-actions">
          <button class="close-btn" id="closeFavoritesBtn">×</button>
        </div>
      </div>
      <div class="history-list" id="favoritesList">
        <!-- 动态生成 -->
      </div>
    `;

    document.querySelector(".container").appendChild(favoritesPanel);

    // 添加关闭事件
    document
      .getElementById("closeFavoritesBtn")
      .addEventListener("click", () => {
        this.hideFavorites();
      });

    return favoritesPanel;
  }

  hideFavorites() {
    const favoritesPanel = document.getElementById("favoritesPanel");
    if (favoritesPanel) {
      favoritesPanel.style.display = "none";
    }
  }

  async addToFavorites(query, engine) {
    try {
      await chrome.runtime.sendMessage({
        action: "addToFavorites",
        query: query,
        engine: engine,
      });
      this.showMessage("已添加到收藏夹");
    } catch (error) {
      console.error("Failed to add to favorites:", error);
    }
  }

  async removeFavorite(index) {
    try {
      await chrome.runtime.sendMessage({
        action: "removeFavorite",
        index: index,
      });
      // 重新加载收藏夹
      const favorites = await chrome.runtime.sendMessage({
        action: "getFavorites",
      });
      this.displayFavorites(favorites || []);
      this.showMessage("已从收藏夹移除");
    } catch (error) {
      console.error("Failed to remove favorite:", error);
    }
  }

  showCustomEngineForm() {
    document.getElementById("customEngineForm").style.display = "flex";
    // 清空表单
    document.getElementById("engineName").value = "";
    document.getElementById("engineUrl").value = "";
    document.getElementById("engineIcon").value = "";
  }

  hideCustomEngineForm() {
    document.getElementById("customEngineForm").style.display = "none";
  }

  async saveCustomEngine() {
    const name = document.getElementById("engineName").value.trim();
    const url = document.getElementById("engineUrl").value.trim();
    const icon = document.getElementById("engineIcon").value.trim() || "🔍";

    if (!name || !url) {
      this.showMessage("请填写完整的搜索引擎信息");
      return;
    }

    if (!url.includes("{query}")) {
      this.showMessage("搜索URL必须包含 {query} 占位符");
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        action: "addCustomEngine",
        engine: { name, url, icon },
      });

      this.hideCustomEngineForm();
      this.generateEngineGrid(); // 重新生成引擎网格
      this.showMessage("自定义搜索引擎已添加");
    } catch (error) {
      console.error("Failed to save custom engine:", error);
      this.showMessage("保存失败，请重试");
    }
  }

  async removeCustomEngine(engineId) {
    if (confirm("确定要删除这个自定义搜索引擎吗？")) {
      try {
        await chrome.runtime.sendMessage({
          action: "removeCustomEngine",
          engineId: engineId,
        });

        this.generateEngineGrid(); // 重新生成引擎网格
        this.showMessage("自定义搜索引擎已删除");
      } catch (error) {
        console.error("Failed to remove custom engine:", error);
      }
    }
  }

  openAggregateSearch() {
    try {
      const query = document.getElementById("searchInput")?.value?.trim();

      if (query) {
        const aggregateUrl = chrome.runtime.getURL(
          `aggregate-search.html?q=${encodeURIComponent(query)}`
        );
        chrome.tabs.create({ url: aggregateUrl });
      } else {
        const aggregateUrl = chrome.runtime.getURL("aggregate-search.html");
        chrome.tabs.create({ url: aggregateUrl });
      }
      window.close();
    } catch (error) {
      console.error("聚合搜索执行错误:", error);
    }
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
    window.close();
  }

  handleGlobalClick(e) {
    // 点击建议区域外时隐藏建议
    if (
      !e.target.closest("#suggestions") &&
      !e.target.closest(".search-input")
    ) {
      this.hideSuggestions();
    }
  }

  showMessage(message) {
    const statusMessage = document.getElementById("statusMessage");
    statusMessage.textContent = message;
    statusMessage.style.display = "block";
    statusMessage.classList.add("show");

    setTimeout(() => {
      statusMessage.classList.remove("show");
      setTimeout(() => {
        statusMessage.style.display = "none";
      }, 300);
    }, 2000);
  }
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  new SearchEnginePopup();
});

// 处理插件快捷键
chrome.commands?.onCommand?.addListener((command) => {
  if (command === "switch-search-engine") {
    // 在弹出窗口中切换搜索引擎
    const popup = window.searchEnginePopup;
    if (popup) {
      popup.showEngineSelector();
    }
  }
});
