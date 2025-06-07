/**
 * 通用主题管理器
 * 可被所有页面（popup、options、aggregate-search等）使用
 */
class ThemeManager {
  constructor() {
    this.currentTheme = "light";
    this.init();
  }

  async init() {
    await this.loadTheme();
    this.applyTheme();
    this.setupSystemThemeListener();
  }

  async loadTheme() {
    try {
      // 从chrome扩展存储中获取主题设置
      if (typeof chrome !== "undefined" && chrome.runtime) {
        const response = await chrome.runtime.sendMessage({
          action: "getSettings",
        });
        this.currentTheme = response?.theme || "light";
      } else {
        // 非扩展环境下，从localStorage获取
        this.currentTheme = localStorage.getItem("theme") || "light";
      }
    } catch (error) {
      console.error("Failed to load theme:", error);
      this.currentTheme = "light";
    }
  }

  applyTheme(theme = this.currentTheme) {
    const body = document.body;

    // 移除所有主题类
    body.classList.remove("theme-light", "theme-dark", "dark-theme");

    // 移除data属性
    body.removeAttribute("data-theme");

    if (theme === "dark") {
      body.classList.add("dark-theme");
      body.setAttribute("data-theme", "dark");
      this.currentTheme = "dark";
    } else if (theme === "auto") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      if (prefersDark) {
        body.classList.add("dark-theme");
        body.setAttribute("data-theme", "dark");
      } else {
        body.setAttribute("data-theme", "light");
      }
      this.currentTheme = "auto";
    } else {
      // light theme
      body.setAttribute("data-theme", "light");
      this.currentTheme = "light";
    }

    console.log("Theme applied:", theme, "Current:", this.currentTheme);
  }

  setupSystemThemeListener() {
    // 监听系统主题变化
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    mediaQuery.addEventListener("change", (e) => {
      if (this.currentTheme === "auto") {
        this.applyTheme("auto");
      }
    });
  }

  async setTheme(theme) {
    this.currentTheme = theme;
    this.applyTheme(theme);

    try {
      // 保存到扩展存储
      if (typeof chrome !== "undefined" && chrome.runtime) {
        const settings = await chrome.runtime.sendMessage({
          action: "getSettings",
        });
        settings.theme = theme;
        await chrome.runtime.sendMessage({
          action: "updateSettings",
          settings: settings,
        });
      } else {
        // 非扩展环境保存到localStorage
        localStorage.setItem("theme", theme);
      }
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  }

  getTheme() {
    return this.currentTheme;
  }

  isDarkMode() {
    const body = document.body;
    return (
      body.classList.contains("dark-theme") ||
      body.getAttribute("data-theme") === "dark"
    );
  }
}

// 全局主题管理器实例
let globalThemeManager = null;

// 初始化函数
function initThemeManager() {
  if (!globalThemeManager) {
    globalThemeManager = new ThemeManager();
  }
  return globalThemeManager;
}

// 自动初始化（如果DOM已加载）
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initThemeManager);
} else {
  initThemeManager();
}

// 导出给其他脚本使用
if (typeof window !== "undefined") {
  window.ThemeManager = ThemeManager;
  window.initThemeManager = initThemeManager;
  window.getThemeManager = () => globalThemeManager;
}
