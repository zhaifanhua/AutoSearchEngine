class OptionsManager {
  constructor() {
    this.settings = null;
    this.customEngines = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.populateForm();
    this.loadCustomEngines();
    // 使用全局主题管理器
    this.initTheme();
  }

  initTheme() {
    if (window.getThemeManager) {
      this.themeManager = window.getThemeManager();
      if (this.themeManager) {
        this.themeManager.applyTheme();
      }
    }
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getSettings",
      });
      this.settings = response || DEFAULT_SETTINGS;
    } catch (error) {
      console.error("Failed to load settings:", error);
      this.settings = DEFAULT_SETTINGS;
    }
  }

  setupEventListeners() {
    // 保存设置按钮
    document.getElementById("saveSettings").addEventListener("click", () => {
      this.saveSettings();
    });

    // 重置设置按钮
    document.getElementById("resetSettings").addEventListener("click", () => {
      this.resetSettings();
    });

    // 清空历史记录
    document.getElementById("clearAllHistory").addEventListener("click", () => {
      this.clearAllHistory();
    });

    // 添加自定义搜索引擎
    document.getElementById("addCustomEngine").addEventListener("click", () => {
      this.showCustomEngineModal();
    });

    // 模态窗口事件
    document.getElementById("modalClose").addEventListener("click", () => {
      this.hideCustomEngineModal();
    });

    document.getElementById("modalCancel").addEventListener("click", () => {
      this.hideCustomEngineModal();
    });

    document.getElementById("modalSave").addEventListener("click", () => {
      this.saveCustomEngine();
    });

    // 点击模态背景关闭
    document
      .getElementById("customEngineModal")
      .addEventListener("click", (e) => {
        if (e.target.id === "customEngineModal") {
          this.hideCustomEngineModal();
        }
      });

    // 监听设置变化
    this.setupSettingListeners();
  }

  setupSettingListeners() {
    // 监听所有设置项的变化，实时保存
    const settingElements = [
      "defaultEngine",
      "openInNewTab",
      "showSuggestions",
      "maxSuggestions",
      "enableContextMenu",
      "enableKeyboardShortcuts",
      "saveHistory",
      "maxHistoryItems",
    ];

    settingElements.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener("change", () => {
          this.autoSaveSettings();
        });
      }
    });

    // 特别处理主题变化
    const themeElement = document.getElementById("theme");
    if (themeElement) {
      themeElement.addEventListener("change", () => {
        const newTheme = themeElement.value;
        // 使用全局主题管理器
        if (this.themeManager) {
          this.themeManager.setTheme(newTheme);
        }
        this.autoSaveSettings();
      });
    }
  }

  populateForm() {
    // 填充默认搜索引擎下拉列表
    this.populateEngineSelect();

    // 设置表单值
    this.setFormValues();

    // 生成搜索引擎列表
    this.generateEngineList();
  }

  populateEngineSelect() {
    const select = document.getElementById("defaultEngine");
    select.innerHTML = "";

    Object.entries(SEARCH_ENGINES).forEach(([id, engine]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = `${engine.icon} ${engine.name}`;
      select.appendChild(option);
    });
  }

  setFormValues() {
    // 基本设置
    document.getElementById("defaultEngine").value =
      this.settings.currentEngine;
    document.getElementById("openInNewTab").checked =
      this.settings.openInNewTab;

    // 功能设置
    document.getElementById("showSuggestions").checked =
      this.settings.showSuggestions;
    document.getElementById("maxSuggestions").value =
      this.settings.maxSuggestions;
    document.getElementById("enableContextMenu").checked =
      this.settings.enableContextMenu;
    document.getElementById("enableKeyboardShortcuts").checked =
      this.settings.enableKeyboardShortcuts;

    // 历史设置
    document.getElementById("saveHistory").checked = this.settings.saveHistory;
    document.getElementById("maxHistoryItems").value =
      this.settings.maxHistoryItems;

    // 主题设置
    document.getElementById("theme").value = this.settings.theme;
  }

  generateEngineList() {
    const engineList = document.getElementById("engineList");
    engineList.innerHTML = "";

    Object.entries(SEARCH_ENGINES).forEach(([id, engine]) => {
      const engineItem = document.createElement("div");
      engineItem.className = `engine-item ${
        this.settings.enabledEngines.includes(id) ? "enabled" : ""
      }`;

      engineItem.innerHTML = `
        <input type="checkbox" 
               class="engine-checkbox" 
               id="engine-${id}" 
               ${this.settings.enabledEngines.includes(id) ? "checked" : ""}>
        <div class="engine-info">
          <span class="engine-icon">${engine.icon}</span>
          <span class="engine-name">${engine.name}</span>
        </div>
      `;

      // 添加事件监听
      const checkbox = engineItem.querySelector(".engine-checkbox");
      checkbox.addEventListener("change", () => {
        this.toggleEngine(id, checkbox.checked);
        engineItem.classList.toggle("enabled", checkbox.checked);
      });

      engineList.appendChild(engineItem);
    });
  }

  toggleEngine(engineId, enabled) {
    if (enabled) {
      if (!this.settings.enabledEngines.includes(engineId)) {
        this.settings.enabledEngines.push(engineId);
      }
    } else {
      this.settings.enabledEngines = this.settings.enabledEngines.filter(
        (id) => id !== engineId
      );
    }

    this.autoSaveSettings();
  }

  async loadCustomEngines() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getCustomEngines",
      });
      this.customEngines = response || {};
      this.displayCustomEngines();
    } catch (error) {
      console.error("Failed to load custom engines:", error);
    }
  }

  displayCustomEngines() {
    const list = document.getElementById("customEnginesList");
    list.innerHTML = "";

    if (Object.keys(this.customEngines).length === 0) {
      list.innerHTML =
        '<p style="color: #6c757d; text-align: center; padding: 20px;">暂无自定义搜索引擎</p>';
      return;
    }

    Object.entries(this.customEngines).forEach(([id, engine]) => {
      const item = document.createElement("div");
      item.className = "custom-engine-item";

      item.innerHTML = `
        <div class="custom-engine-info">
          <span class="custom-engine-icon">${engine.icon || "🔍"}</span>
          <div class="custom-engine-details">
            <h4>${engine.name}</h4>
            <p>${engine.url}</p>
          </div>
        </div>
        <div class="custom-engine-actions">
          <button class="remove-button" data-id="${id}">删除</button>
        </div>
      `;

      // 添加删除事件
      item.querySelector(".remove-button").addEventListener("click", () => {
        this.removeCustomEngine(id);
      });

      list.appendChild(item);
    });
  }

  showCustomEngineModal() {
    const modal = document.getElementById("customEngineModal");
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 10);

    // 清空表单
    document.getElementById("modalEngineName").value = "";
    document.getElementById("modalEngineUrl").value = "";
    document.getElementById("modalEngineIcon").value = "";
  }

  hideCustomEngineModal() {
    const modal = document.getElementById("customEngineModal");
    modal.classList.remove("show");
    setTimeout(() => (modal.style.display = "none"), 300);
  }

  async saveCustomEngine() {
    const name = document.getElementById("modalEngineName").value.trim();
    const url = document.getElementById("modalEngineUrl").value.trim();
    const icon =
      document.getElementById("modalEngineIcon").value.trim() || "🔍";

    if (!name) {
      this.showToast("请输入搜索引擎名称", "error");
      return;
    }

    if (!url) {
      this.showToast("请输入搜索URL", "error");
      return;
    }

    if (!url.includes("{query}")) {
      this.showToast("搜索URL必须包含 {query} 占位符", "error");
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        action: "addCustomEngine",
        engine: { name, url, icon },
      });

      this.hideCustomEngineModal();
      await this.loadCustomEngines();
      this.showToast("自定义搜索引擎已添加");
    } catch (error) {
      console.error("Failed to save custom engine:", error);
      this.showToast("保存失败，请重试", "error");
    }
  }

  async removeCustomEngine(engineId) {
    if (!confirm("确定要删除这个自定义搜索引擎吗？")) {
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        action: "removeCustomEngine",
        engineId: engineId,
      });

      await this.loadCustomEngines();
      this.showToast("自定义搜索引擎已删除");
    } catch (error) {
      console.error("Failed to remove custom engine:", error);
      this.showToast("删除失败，请重试", "error");
    }
  }

  async autoSaveSettings() {
    // 从表单收集设置
    const newSettings = this.collectFormData();

    try {
      await chrome.runtime.sendMessage({
        action: "updateSettings",
        settings: newSettings,
      });

      this.settings = newSettings;
    } catch (error) {
      console.error("Failed to auto-save settings:", error);
    }
  }

  async saveSettings() {
    const newSettings = this.collectFormData();

    try {
      await chrome.runtime.sendMessage({
        action: "updateSettings",
        settings: newSettings,
      });

      this.settings = newSettings;
      this.showToast("设置已保存");
    } catch (error) {
      console.error("Failed to save settings:", error);
      this.showToast("保存失败，请重试", "error");
    }
  }

  collectFormData() {
    return {
      currentEngine: document.getElementById("defaultEngine").value,
      enabledEngines: this.settings.enabledEngines, // 从当前设置保留
      openInNewTab: document.getElementById("openInNewTab").checked,
      showSuggestions: document.getElementById("showSuggestions").checked,
      maxSuggestions: parseInt(document.getElementById("maxSuggestions").value),
      enableContextMenu: document.getElementById("enableContextMenu").checked,
      enableKeyboardShortcuts: document.getElementById(
        "enableKeyboardShortcuts"
      ).checked,
      saveHistory: document.getElementById("saveHistory").checked,
      maxHistoryItems: parseInt(
        document.getElementById("maxHistoryItems").value
      ),
      theme: document.getElementById("theme").value,
    };
  }

  async resetSettings() {
    if (!confirm("确定要重置所有设置吗？这将清除所有自定义配置。")) {
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        action: "updateSettings",
        settings: DEFAULT_SETTINGS,
      });

      this.settings = DEFAULT_SETTINGS;
      this.setFormValues();
      this.generateEngineList();
      this.showToast("设置已重置");
    } catch (error) {
      console.error("Failed to reset settings:", error);
      this.showToast("重置失败，请重试", "error");
    }
  }

  async clearAllHistory() {
    if (!confirm("确定要清空所有搜索历史吗？此操作不可撤销。")) {
      return;
    }

    try {
      await chrome.runtime.sendMessage({ action: "clearHistory" });
      this.showToast("搜索历史已清空");
    } catch (error) {
      console.error("Failed to clear history:", error);
      this.showToast("清空失败，请重试", "error");
    }
  }

  showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");

    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = "block";

    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => (toast.style.display = "none"), 300);
    }, 3000);
  }

  // 导出设置功能
  exportSettings() {
    const data = {
      settings: this.settings,
      customEngines: this.customEngines,
      exportTime: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `search-engine-settings-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();

    URL.revokeObjectURL(url);
    this.showToast("设置已导出");
  }

  // 导入设置功能
  importSettings(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (data.settings) {
          await chrome.runtime.sendMessage({
            action: "updateSettings",
            settings: data.settings,
          });
          this.settings = data.settings;
        }

        if (data.customEngines) {
          // 导入自定义搜索引擎
          for (const engine of Object.values(data.customEngines)) {
            await chrome.runtime.sendMessage({
              action: "addCustomEngine",
              engine: engine,
            });
          }
        }

        // 刷新界面
        this.setFormValues();
        this.generateEngineList();
        await this.loadCustomEngines();

        this.showToast("设置已导入");
      } catch (error) {
        console.error("Failed to import settings:", error);
        this.showToast("导入失败，文件格式错误", "error");
      }
    };

    reader.readAsText(file);
  }
}

// 初始化设置管理器
document.addEventListener("DOMContentLoaded", () => {
  new OptionsManager();
});

// 键盘快捷键支持
document.addEventListener("keydown", (e) => {
  // Ctrl+S 保存设置
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    document.getElementById("saveSettings").click();
  }
});
