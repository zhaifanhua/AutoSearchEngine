// 内容脚本 - 在网页中注入的功能
class SearchEngineContentScript {
  constructor() {
    this.selectedText = "";
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
  }

  setupEventListeners() {
    // 监听文本选择
    document.addEventListener("mouseup", () => {
      this.handleTextSelection();
    });

    document.addEventListener("keyup", () => {
      this.handleTextSelection();
    });

    // 监听消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Ctrl+Shift+F 快速搜索选中文本
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        this.quickSearchSelected();
      }
    });
  }

  handleTextSelection() {
    const selection = window.getSelection();
    this.selectedText = selection.toString().trim();
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case "getSelectedText":
        sendResponse({ selectedText: this.selectedText });
        break;
      case "searchSelected":
        this.searchSelectedText(request.engine);
        break;
    }
  }

  async quickSearchSelected() {
    if (!this.selectedText) return;

    try {
      // 获取当前搜索引擎设置
      const response = await chrome.runtime.sendMessage({
        action: "getSettings",
      });
      const settings = response || {
        currentEngine: "google",
        openInNewTab: true,
      };

      // 执行搜索
      await chrome.runtime.sendMessage({
        action: "search",
        query: this.selectedText,
        engine: settings.currentEngine,
        openInNewTab: settings.openInNewTab,
      });
    } catch (error) {
      console.error("Quick search failed:", error);
    }
  }

  async searchSelectedText(engine) {
    if (!this.selectedText) return;

    try {
      await chrome.runtime.sendMessage({
        action: "search",
        query: this.selectedText,
        engine: engine,
        openInNewTab: true,
      });
    } catch (error) {
      console.error("Search selected text failed:", error);
    }
  }

  // 创建临时搜索框（高级功能）
  createFloatingSearchBox() {
    if (
      !this.selectedText ||
      document.getElementById("search-engine-float-box")
    )
      return;

    const floatBox = document.createElement("div");
    floatBox.id = "search-engine-float-box";
    floatBox.className = "search-engine-float-box";

    floatBox.innerHTML = `
      <div class="float-box-content">
        <div class="float-box-query">"${this.selectedText}"</div>
        <div class="float-box-engines">
          <button data-engine="google">Google</button>
          <button data-engine="baidu">百度</button>
          <button data-engine="bing">Bing</button>
        </div>
      </div>
    `;

    // 定位到选中文本附近
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      floatBox.style.position = "fixed";
      floatBox.style.left = `${rect.left}px`;
      floatBox.style.top = `${rect.bottom + 10}px`;
      floatBox.style.zIndex = "10000";
    }

    // 添加事件监听
    floatBox.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") {
        const engine = e.target.dataset.engine;
        this.searchSelectedText(engine);
        this.removeFloatingSearchBox();
      }
    });

    document.body.appendChild(floatBox);

    // 3秒后自动移除
    setTimeout(() => {
      this.removeFloatingSearchBox();
    }, 3000);
  }

  removeFloatingSearchBox() {
    const floatBox = document.getElementById("search-engine-float-box");
    if (floatBox) {
      floatBox.remove();
    }
  }
}

// 初始化内容脚本
new SearchEngineContentScript();
