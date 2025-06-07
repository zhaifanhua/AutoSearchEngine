class AggregateSearchManager {
  constructor() {
    this.currentQuery = "";
    this.enabledEngines = [];
    this.settings = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.initTheme();
    this.setupEventListeners();
    this.loadQueryFromURL();
    this.generateSearchResults();

    // 如果有搜索词，自动开始搜索
    if (this.currentQuery) {
      setTimeout(() => {
        this.openAllEngines();
      }, 500);
    } else {
      // 如果没有搜索词，自动打开新搜索框
      setTimeout(() => {
        this.showNewSearchModal();
      }, 300); // 减少延迟，提升响应速度
    }
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
      // 尝试从扩展获取设置
      if (typeof chrome !== "undefined" && chrome.runtime) {
        const response = await chrome.runtime.sendMessage({
          action: "getSettings",
        });
        this.settings = response || window.DEFAULT_SETTINGS || {};
      } else {
        this.settings = window.DEFAULT_SETTINGS || {};
      }
      this.enabledEngines =
        this.settings.enabledEngines ||
        Object.keys(window.SEARCH_ENGINES || {});
    } catch (error) {
      console.error("Failed to load settings:", error);
      this.settings = window.DEFAULT_SETTINGS || {};
      this.enabledEngines = Object.keys(window.SEARCH_ENGINES || {});
    }
  }

  loadQueryFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q") || urlParams.get("query");
    if (query) {
      this.currentQuery = decodeURIComponent(query);
      const queryElement = document.getElementById("currentQuery");
      if (queryElement) {
        queryElement.textContent = this.currentQuery;
      }
    }
  }

  setupEventListeners() {
    // 新搜索按钮
    const newSearchBtn = document.getElementById("newSearchBtn");
    if (newSearchBtn) {
      newSearchBtn.addEventListener("click", () => {
        this.showNewSearchModal();
      });
    }

    // 打开全部按钮
    const openAllBtn = document.getElementById("openAllBtn");
    if (openAllBtn) {
      openAllBtn.addEventListener("click", () => {
        this.openAllEngines();
      });
    }

    // 全屏切换按钮
    const fullscreenToggle = document.getElementById("fullscreenToggle");
    if (fullscreenToggle) {
      fullscreenToggle.addEventListener("click", () => {
        this.toggleFullscreen();
      });
    }

    // 全屏退出悬浮按钮
    const fullscreenExitHint = document.getElementById("fullscreenExitHint");
    if (fullscreenExitHint) {
      fullscreenExitHint.addEventListener("click", () => {
        console.log("点击悬浮退出按钮"); // 调试日志
        this.toggleFullscreen();
      });
    }

    // 新搜索模态窗口
    document.getElementById("closeModalBtn").addEventListener("click", () => {
      this.hideNewSearchModal();
    });

    document.getElementById("cancelBtn").addEventListener("click", () => {
      this.hideNewSearchModal();
    });

    document.getElementById("searchBtn").addEventListener("click", () => {
      this.performNewSearch();
    });

    // 搜索输入框回车键
    document
      .getElementById("newQueryInput")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.performNewSearch();
        }
      });

    // 结果展示区域（可选元素，避免null错误）
    const closeResultBtn = document.getElementById("closeResultBtn");
    if (closeResultBtn) {
      closeResultBtn.addEventListener("click", () => {
        this.hideCurrentResult();
      });
    }

    const fullscreenBtn = document.getElementById("fullscreenBtn");
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener("click", () => {
        this.openInNewTab();
      });
    }

    // 点击模态背景关闭
    document.getElementById("newSearchModal").addEventListener("click", (e) => {
      if (e.target.id === "newSearchModal") {
        this.hideNewSearchModal();
      }
    });

    // 键盘快捷键
    document.addEventListener(
      "keydown",
      (e) => {
        // Ctrl+K 或 Cmd+K 开启新搜索
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
          e.preventDefault();
          this.showNewSearchModal();
          return;
        }

        // Esc 关闭模态窗口、结果或退出全屏
        if (e.key === "Escape") {
          console.log("ESC键被按下"); // 调试日志
          e.preventDefault();
          e.stopPropagation();

          const grid = document.getElementById("searchResultsGrid");
          const modal = document.getElementById("newSearchModal");

          console.log("网格元素:", grid); // 调试日志
          console.log(
            "全屏状态:",
            grid ? grid.classList.contains("fullscreen") : "grid不存在"
          ); // 调试日志
          console.log("模态框元素:", modal); // 调试日志
          console.log(
            "模态框状态:",
            modal ? modal.classList.contains("show") : "modal不存在"
          ); // 调试日志

          // 优先检查是否在全屏模式
          if (grid && grid.classList.contains("fullscreen")) {
            console.log("执行退出全屏操作"); // 调试日志
            this.toggleFullscreen();
            return; // 确保不继续执行其他逻辑
          }
          // 然后检查是否有模态窗口打开
          else if (modal && modal.classList.contains("show")) {
            console.log("执行关闭模态窗口操作"); // 调试日志
            this.hideNewSearchModal();
            return;
          }

          console.log("没有执行任何ESC操作"); // 调试日志
        }
      },
      true
    ); // 使用捕获阶段，确保优先处理
  }

  generateSearchResults() {
    const grid = document.getElementById("searchResultsGrid");
    grid.innerHTML = "";

    if (!this.currentQuery) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
          <div style="font-size: 3rem; margin-bottom: 20px; opacity: 0.7;">🔍</div>
          <h3 style="color: #2c3e50; font-size: 1.5rem; margin-bottom: 16px; font-weight: 600;">请输入搜索关键词</h3>
          <p style="color: #34495e; font-size: 1.1rem; line-height: 1.6; background: rgba(52, 152, 219, 0.1); padding: 12px 20px; border-radius: 8px; border-left: 4px solid #3498db; margin: 0 auto; max-width: 400px;">点击右侧的<strong style="color: #3498db;">"新搜索"</strong>按钮开始搜索</p>
        </div>
      `;
      return;
    }

    // 确保SEARCH_ENGINES已加载
    if (!window.SEARCH_ENGINES) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #dc3545;">
          <div style="font-size: 3rem; margin-bottom: 20px;">❌</div>
          <h3>搜索引擎配置加载失败</h3>
          <p>请刷新页面重试</p>
          <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer;">刷新页面</button>
        </div>
      `;
      return;
    }

    this.enabledEngines.forEach((engineId) => {
      const engine = window.SEARCH_ENGINES[engineId];
      if (!engine) return;

      const card = this.createResultCard(engineId, engine);
      grid.appendChild(card);
    });
  }

  createResultCard(engineId, engine) {
    const card = document.createElement("div");
    card.className = "result-card";
    card.style.setProperty("--engine-color", engine.color);

    const searchUrl = engine.url.replace(
      "{query}",
      encodeURIComponent(this.currentQuery)
    );

    card.innerHTML = `
      <div class="result-header">
        <div class="result-engine-info">
          <span class="result-engine-icon">${engine.icon}</span>
          <span class="result-engine-name">${engine.name}</span>
        </div>
        <div class="result-actions">
          <button class="icon-btn" data-action="refresh" title="刷新" data-engine="${engineId}">🔄</button>
          <button class="icon-btn" data-action="newtab" title="新标签页打开" data-engine="${engineId}">🔗</button>
        </div>
      </div>
      
      <div class="result-iframe-container">
        <div class="result-overlay" id="overlay-${engineId}">
          <div class="result-placeholder">
            <div class="result-placeholder-icon">${engine.icon}</div>
            <div class="result-placeholder-text">点击下方按钮加载 ${engine.name} 搜索结果</div>
            <button class="load-result-btn" data-engine="${engineId}" style="background: ${engine.color}">
              加载搜索结果
            </button>
          </div>
        </div>
        <iframe class="result-iframe" id="iframe-${engineId}" src="" style="display: none;"></iframe>
      </div>
    `;

    // 添加事件监听
    const loadBtn = card.querySelector(".load-result-btn");
    const refreshBtn = card.querySelector('[data-action="refresh"]');
    const newTabBtn = card.querySelector('[data-action="newtab"]');

    loadBtn.addEventListener("click", () =>
      this.loadSearchResult(engineId, searchUrl)
    );
    refreshBtn.addEventListener("click", () =>
      this.loadSearchResult(engineId, searchUrl)
    );
    newTabBtn.addEventListener("click", () => window.open(searchUrl, "_blank"));

    return card;
  }

  searchInEngine(engineId, openInNewTab = false) {
    if (!this.currentQuery) {
      this.showNewSearchModal();
      return;
    }

    const engine = SEARCH_ENGINES[engineId];
    if (!engine) return;

    const searchUrl = engine.url.replace(
      "{query}",
      encodeURIComponent(this.currentQuery)
    );

    // 由于跨域限制，所有搜索都在新标签页打开
    window.open(searchUrl, "_blank");
    this.showToast(`已在 ${engine.name} 中搜索：${this.currentQuery}`);
  }

  previewSearch(engineId, engine) {
    if (!this.currentQuery) {
      this.showNewSearchModal();
      return;
    }

    // 显示搜索预览信息而不是iframe
    this.loadSearchResult(
      engineId,
      engine.url.replace("{query}", encodeURIComponent(this.currentQuery))
    );
  }

  async loadSearchResult(engineId, searchUrl) {
    const overlay = document.getElementById(`overlay-${engineId}`);
    const iframe = document.getElementById(`iframe-${engineId}`);

    if (!overlay || !iframe) return;

    // 显示加载状态
    overlay.innerHTML = `
      <div class="result-placeholder">
        <div class="result-placeholder-icon">⏳</div>
        <div class="result-placeholder-text">正在提取搜索结果...</div>
      </div>
    `;

    try {
      // 首先尝试API方式获取结果
      const apiResults = await this.fetchResultsViaAPI(
        engineId,
        this.currentQuery
      );
      if (apiResults && apiResults.length > 0) {
        this.displayExtractedResults(engineId, apiResults);
        return;
      }
    } catch (error) {
      console.log("API获取失败，尝试内容提取:", error);
    }

    try {
      // 然后尝试使用内容提取
      const results = await this.extractSearchResults(searchUrl);
      if (results && results.length > 0) {
        this.displayExtractedResults(engineId, results);
        return;
      }
    } catch (error) {
      console.log("内容提取失败，回退到iframe模式:", error);
    }

    // 回退到iframe模式
    overlay.innerHTML = `
      <div class="result-placeholder">
        <div class="result-placeholder-icon">⏳</div>
        <div class="result-placeholder-text">正在加载搜索结果...</div>
      </div>
    `;

    // 设置iframe源
    iframe.src = searchUrl;
    iframe.style.display = "block";

    // 处理iframe加载事件
    iframe.onload = () => {
      overlay.style.display = "none";
      // 更新header显示iframe信息
      this.updateHeaderInfo(engineId, 0, searchUrl);
    };

    iframe.onerror = () => {
      overlay.innerHTML = `
        <div class="result-placeholder">
          <div class="result-placeholder-icon">❌</div>
          <div class="result-placeholder-text">由于跨域限制，无法直接显示搜索结果</div>
          <button class="load-result-btn" onclick="window.open('${searchUrl}', '_blank')" style="background: var(--engine-color)">
            在新标签页中打开
          </button>
        </div>
      `;
      overlay.style.display = "flex";
      iframe.style.display = "none";
      // 更新header显示错误信息
      this.updateHeaderInfo(engineId, 0, searchUrl);
    };

    // 5秒后如果还没加载完成，显示错误信息
    setTimeout(() => {
      if (overlay.style.display !== "none") {
        iframe.onerror();
      }
    }, 5000);
  }

  openAllEngines() {
    if (!this.currentQuery) {
      this.showNewSearchModal();
      return;
    }

    // 在当前页面加载所有搜索引擎的结果
    // 确保SEARCH_ENGINES已加载
    if (!window.SEARCH_ENGINES) {
      this.showToast("搜索引擎配置加载失败，请刷新页面重试");
      return;
    }

    this.enabledEngines.forEach((engineId, index) => {
      const engine = window.SEARCH_ENGINES[engineId];
      if (engine) {
        const searchUrl = engine.url.replace(
          "{query}",
          encodeURIComponent(this.currentQuery)
        );
        // 延迟加载，避免同时加载太多
        setTimeout(() => {
          this.loadSearchResult(engineId, searchUrl);
        }, index * 500);
      }
    });

    // 显示提示信息
    this.showToast(`正在加载${this.enabledEngines.length}个搜索引擎的结果...`);
  }

  toggleFullscreen() {
    const grid = document.getElementById("searchResultsGrid");
    const container = document.querySelector(".container");
    const fullscreenBtn = document.getElementById("fullscreenToggle");
    const exitHint = document.getElementById("fullscreenExitHint");

    if (!grid || !container || !fullscreenBtn) return;

    const isFullscreen = grid.classList.contains("fullscreen");

    if (isFullscreen) {
      // 退出全屏
      grid.classList.remove("fullscreen");
      container.style.position = "";
      container.style.zIndex = "";
      if (exitHint) exitHint.style.display = "none";
      fullscreenBtn.innerHTML = `
        <span>⛶</span>
        <span>全屏模式</span>
      `;
      this.showToast("已退出全屏模式");
    } else {
      // 进入全屏
      grid.classList.add("fullscreen");
      container.style.position = "relative";
      container.style.zIndex = "1999";
      if (exitHint) exitHint.style.display = "block";
      fullscreenBtn.innerHTML = `
        <span>⊡</span>
        <span>退出全屏</span>
      `;
      this.showToast("已进入全屏模式，点击左上角红色按钮退出");
    }
  }

  showNewSearchModal() {
    const modal = document.getElementById("newSearchModal");
    const input = document.getElementById("newQueryInput");

    if (!modal || !input) {
      console.error("模态框或输入框元素未找到");
      return;
    }

    modal.classList.add("show");
    input.value = this.currentQuery || "";

    // 延迟一点再focus，确保模态框已显示
    setTimeout(() => {
      input.focus();
      if (this.currentQuery) {
        input.select();
      }
    }, 100);
  }

  hideNewSearchModal() {
    const modal = document.getElementById("newSearchModal");
    modal.classList.remove("show");
  }

  performNewSearch() {
    const input = document.getElementById("newQueryInput");
    const query = input.value.trim();

    if (!query) {
      input.focus();
      return;
    }

    this.currentQuery = query;
    document.getElementById("currentQuery").textContent = query;

    // 更新URL
    const url = new URL(window.location);
    url.searchParams.set("q", encodeURIComponent(query));
    window.history.pushState({}, "", url);

    this.hideNewSearchModal();

    // 重新生成搜索结果
    this.generateSearchResults();

    // 自动开始加载所有搜索引擎结果
    setTimeout(() => {
      this.openAllEngines();
    }, 100);
  }

  // 通过API获取搜索结果（备选方案）
  async fetchResultsViaAPI(engineId, query) {
    try {
      // 检查是否有可用的API端点
      const apiEndpoints = {
        google: `https://www.googleapis.com/customsearch/v1?key=YOUR_API_KEY&cx=YOUR_CX&q=${encodeURIComponent(
          query
        )}`,
        bing: `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(
          query
        )}`,
        duckduckgo: `https://api.duckduckgo.com/?q=${encodeURIComponent(
          query
        )}&format=json&no_html=1`,
        wikipedia: `https://zh.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
          query
        )}&format=json&origin=*`,
      };

      const apiUrl = apiEndpoints[engineId];
      if (!apiUrl) {
        throw new Error("该搜索引擎暂不支持API方式");
      }

      // 通过后台脚本发送API请求（避免CORS问题）
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: "fetchAPI",
            url: apiUrl,
            engineId: engineId,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (response && response.success) {
              resolve(response.data);
            } else {
              reject(new Error(response?.error || "API请求失败"));
            }
          }
        );
      });

      // 根据不同API格式解析结果
      return this.parseAPIResults(engineId, response);
    } catch (error) {
      console.error(`${engineId} API获取失败:`, error);
      throw error;
    }
  }

  // 解析不同API的返回结果
  parseAPIResults(engineId, data) {
    const results = [];

    try {
      switch (engineId) {
        case "google":
          if (data.items) {
            data.items.forEach((item) => {
              results.push({
                title: item.title || "",
                url: item.link || "",
                snippet: item.snippet || "",
              });
            });
          }
          break;

        case "bing":
          if (data.webPages && data.webPages.value) {
            data.webPages.value.forEach((item) => {
              results.push({
                title: item.name || "",
                url: item.url || "",
                snippet: item.snippet || "",
              });
            });
          }
          break;

        case "duckduckgo":
          if (data.RelatedTopics) {
            data.RelatedTopics.forEach((item) => {
              if (item.FirstURL) {
                results.push({
                  title: item.Text ? item.Text.split(" - ")[0] : "",
                  url: item.FirstURL || "",
                  snippet: item.Text || "",
                });
              }
            });
          }
          break;

        case "wikipedia":
          if (Array.isArray(data) && data.length >= 4) {
            const titles = data[1] || [];
            const descriptions = data[2] || [];
            const urls = data[3] || [];

            titles.forEach((title, index) => {
              results.push({
                title: title || "",
                url: urls[index] || "",
                snippet: descriptions[index] || "",
              });
            });
          }
          break;
      }
    } catch (error) {
      console.error(`解析${engineId}API结果失败:`, error);
    }

    return results.slice(0, 10); // 限制返回前10条结果
  }

  // 使用扩展API提取搜索结果
  async extractSearchResults(searchUrl) {
    try {
      // 通过后台脚本进行内容提取
      const results = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: "extractSearchResults",
            url: searchUrl,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (response && response.success) {
              resolve(response.results || []);
            } else {
              reject(new Error(response?.error || "提取失败"));
            }
          }
        );
      });

      return results;
    } catch (error) {
      console.error("提取搜索结果失败:", error);
      throw error;
    }
  }

  // 显示提取的搜索结果
  displayExtractedResults(engineId, results) {
    const overlay = document.getElementById(`overlay-${engineId}`);
    const iframe = document.getElementById(`iframe-${engineId}`);

    if (!overlay) return;

    // 隐藏iframe，显示提取的内容
    if (iframe) iframe.style.display = "none";

    // 构建结果HTML
    const resultsHtml = results
      .map(
        (result, index) => `
      <div class="extracted-result" data-index="${index}">
        <div class="result-title">
          <a href="${result.url}" target="_blank" rel="noopener">${
          result.title
        }</a>
        </div>
        <div class="result-url">${result.url}</div>
        ${
          result.snippet
            ? `<div class="result-snippet">${result.snippet}</div>`
            : ""
        }
      </div>
    `
      )
      .join("");

    overlay.innerHTML = `
      <div class="extracted-results" id="extracted-${engineId}">
        <div class="results-list" id="results-list-${engineId}">
          ${resultsHtml}
        </div>
        <div class="load-more-indicator" id="load-more-${engineId}" style="display: none;">
          <div class="loading-spinner">⏳</div>
          <div>正在加载更多结果...</div>
        </div>
      </div>
    `;

    // 更新header中的结果信息
    this.updateHeaderInfo(engineId, results.length, results[0]?.url);

    overlay.style.display = "block";

    // 添加滚动监听以实现自动翻页
    this.setupAutoScrollPagination(engineId, results);
  }

  // 更新卡片header中的结果信息
  updateHeaderInfo(engineId, resultCount, originalUrl) {
    const resultCard = document
      .querySelector(`[data-engine="${engineId}"]`)
      ?.closest(".result-card");
    if (!resultCard) return;

    const header = resultCard.querySelector(".result-header");
    if (!header) return;

    // 查找或创建meta信息容器
    let metaInfo = header.querySelector(".result-meta-info");
    if (!metaInfo) {
      metaInfo = document.createElement("div");
      metaInfo.className = "result-meta-info";

      // 插入到engine-info之后，actions之前
      const engineInfo = header.querySelector(".result-engine-info");
      const actions = header.querySelector(".result-actions");
      if (engineInfo && actions) {
        header.insertBefore(metaInfo, actions);
      } else {
        header.appendChild(metaInfo);
      }
    }

    // 构建meta信息内容
    const metaContent = [];

    if (resultCount > 0) {
      metaContent.push(
        `<span class="result-count">找到 ${resultCount} 条结果</span>`
      );
    }

    if (originalUrl) {
      metaContent.push(
        `<button class="view-original-btn" onclick="window.open('${originalUrl}', '_blank')">原始页面</button>`
      );
    }

    metaInfo.innerHTML = metaContent.join("");
  }

  // 设置自动滚动翻页
  setupAutoScrollPagination(engineId, initialResults) {
    const resultsList = document.getElementById(`results-list-${engineId}`);
    const loadMoreIndicator = document.getElementById(`load-more-${engineId}`);

    if (!resultsList) return;

    // 存储当前页数和结果
    let currentPage = 1;
    let allResults = [...initialResults];
    let isLoading = false;

    // 创建滚动监听器
    const scrollHandler = async () => {
      if (isLoading) return;

      const scrollTop = resultsList.scrollTop;
      const scrollHeight = resultsList.scrollHeight;
      const clientHeight = resultsList.clientHeight;

      // 当滚动到底部附近时触发加载
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        isLoading = true;

        if (loadMoreIndicator) {
          loadMoreIndicator.style.display = "block";
        }

        try {
          // 模拟加载更多结果
          await this.loadMoreResults(engineId, currentPage + 1);
          currentPage++;

          // 显示成功消息
          this.showToast(
            `${this.getEngineName(engineId)} 已加载第${currentPage}页结果`
          );
        } catch (error) {
          console.error("加载更多结果失败:", error);
          this.showToast("加载更多结果失败，请稍后重试");
        } finally {
          if (loadMoreIndicator) {
            loadMoreIndicator.style.display = "none";
          }
          isLoading = false;
        }
      }
    };

    // 添加滚动事件监听
    resultsList.addEventListener("scroll", scrollHandler);

    // 存储清理函数以备后用
    if (!this.scrollCleanupFunctions) {
      this.scrollCleanupFunctions = {};
    }
    this.scrollCleanupFunctions[engineId] = () => {
      resultsList.removeEventListener("scroll", scrollHandler);
    };
  }

  // 获取搜索引擎名称
  getEngineName(engineId) {
    const engine = window.SEARCH_ENGINES && window.SEARCH_ENGINES[engineId];
    return engine ? engine.name : engineId;
  }

  // 加载更多结果
  async loadMoreResults(engineId, page) {
    const engine = window.SEARCH_ENGINES[engineId];
    if (!engine || !this.currentQuery) return;

    // 构建带分页的搜索URL
    let searchUrl = engine.url.replace(
      "{query}",
      encodeURIComponent(this.currentQuery)
    );

    // 为支持分页的搜索引擎添加页码参数
    if (engine.pagination) {
      // 根据不同搜索引擎的分页参数格式计算页码
      let pageParam = engine.pagination;
      if (pageParam.includes("{page}0")) {
        // Google: start=10, 20, 30...
        pageParam = pageParam.replace("{page}", page - 1);
      } else if (pageParam.includes("{page}1")) {
        // Bing: first=11, 21, 31...
        pageParam = pageParam.replace("{page}", (page - 1) * 10 + 1);
      } else {
        // 其他: 直接替换页码
        pageParam = pageParam.replace("{page}", page);
      }
      searchUrl += pageParam;
    } else {
      // 对于不支持分页的搜索引擎，我们使用通用分页参数
      searchUrl += `&start=${(page - 1) * 10}`;
    }

    try {
      const moreResults = await this.extractSearchResults(searchUrl);
      if (moreResults && moreResults.length > 0) {
        this.appendMoreResults(engineId, moreResults);
      } else {
        // 没有更多结果
        this.showNoMoreResults(engineId);
      }
    } catch (error) {
      throw error;
    }
  }

  // 追加更多结果到列表
  appendMoreResults(engineId, newResults) {
    const resultsList = document.getElementById(`results-list-${engineId}`);
    if (!resultsList) return;

    const newResultsHtml = newResults
      .map(
        (result, index) => `
        <div class="extracted-result" data-index="${index}">
          <div class="result-title">
            <a href="${result.url}" target="_blank" rel="noopener">${
          result.title
        }</a>
          </div>
          <div class="result-url">${result.url}</div>
          ${
            result.snippet
              ? `<div class="result-snippet">${result.snippet}</div>`
              : ""
          }
        </div>
      `
      )
      .join("");

    resultsList.insertAdjacentHTML("beforeend", newResultsHtml);

    // 更新结果计数
    const countElement = resultsList
      .closest(".extracted-results")
      ?.querySelector(".results-count");
    if (countElement) {
      const currentCount = parseInt(
        countElement.textContent.match(/\d+/)?.[0] || "0"
      );
      const newCount = currentCount + newResults.length;
      countElement.textContent = `找到 ${newCount} 条结果`;
    }
  }

  // 显示没有更多结果
  showNoMoreResults(engineId) {
    const resultsList = document.getElementById(`results-list-${engineId}`);
    if (!resultsList) return;

    const noMoreDiv = document.createElement("div");
    noMoreDiv.className = "no-more-results";
    noMoreDiv.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #6c757d;">
        <div style="font-size: 1.5rem; margin-bottom: 8px;">📄</div>
        <div>已显示所有结果</div>
      </div>
    `;

    resultsList.appendChild(noMoreDiv);

    // 移除滚动监听器
    if (this.scrollCleanupFunctions && this.scrollCleanupFunctions[engineId]) {
      this.scrollCleanupFunctions[engineId]();
      delete this.scrollCleanupFunctions[engineId];
    }
  }

  showToast(message) {
    // 创建临时提示消息
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 2000;
      font-weight: 500;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    // 显示动画
    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    }, 100);

    // 自动隐藏
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-20px)";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", () => {
  const manager = new AggregateSearchManager();

  // 备用的自动弹出逻辑，防止异步问题
  setTimeout(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q") || urlParams.get("query");

    if (!query) {
      const modal = document.getElementById("newSearchModal");
      if (modal && !modal.classList.contains("show")) {
        manager.showNewSearchModal();
      }
    }
  }, 800); // 0.8秒后的备用检查
});

// 导出给扩展使用
if (typeof window !== "undefined") {
  window.AggregateSearchManager = AggregateSearchManager;
}
