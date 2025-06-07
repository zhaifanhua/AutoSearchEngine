// 搜索结果内容提取器
class SearchResultExtractor {
  constructor() {
    this.extractors = {
      "google.com": this.extractGoogle.bind(this),
      "baidu.com": this.extractBaidu.bind(this),
      "bing.com": this.extractBing.bind(this),
      "duckduckgo.com": this.extractDuckDuckGo.bind(this),
      "sogou.com": this.extractSogou.bind(this),
      "so.com": this.extract360.bind(this),
      "yandex.com": this.extractYandex.bind(this),
      "yahoo.com": this.extractYahoo.bind(this),
      "github.com": this.extractGitHub.bind(this),
      "stackoverflow.com": this.extractStackOverflow.bind(this),
      "wikipedia.org": this.extractWikipedia.bind(this),
      "zhihu.com": this.extractZhihu.bind(this),
      "bilibili.com": this.extractBilibili.bind(this),
    };
  }

  // 提取搜索结果
  extractResults(hostname) {
    try {
      const extractor = this.getExtractor(hostname);
      if (extractor) {
        return extractor();
      }
      return this.extractGeneric();
    } catch (error) {
      console.error("提取搜索结果失败:", error);
      return this.extractGeneric();
    }
  }

  // 获取对应的提取器
  getExtractor(hostname) {
    for (const [domain, extractor] of Object.entries(this.extractors)) {
      if (hostname.includes(domain)) {
        return extractor;
      }
    }
    return null;
  }

  // Google搜索结果提取
  extractGoogle() {
    const results = [];
    const resultElements = document.querySelectorAll(".g, .tF2Cxc");

    resultElements.forEach((element, index) => {
      if (index >= 10) return; // 只提取前10条

      const titleElement = element.querySelector("h3, .LC20lb");
      const linkElement = element.querySelector("a[href]");
      const snippetElement = element.querySelector(".VwiC3b, .s3v9rd, .st");

      if (titleElement && linkElement) {
        results.push({
          title: titleElement.textContent.trim(),
          url: linkElement.href,
          snippet: snippetElement ? snippetElement.textContent.trim() : "",
        });
      }
    });

    return results;
  }

  // 百度搜索结果提取
  extractBaidu() {
    const results = [];
    const resultElements = document.querySelectorAll(".result, .result-op");

    resultElements.forEach((element, index) => {
      if (index >= 10) return;

      const titleElement = element.querySelector("h3 a, .t a");
      const snippetElement = element.querySelector(".c-abstract, .c-span9");

      if (titleElement) {
        results.push({
          title: titleElement.textContent.trim(),
          url: titleElement.href,
          snippet: snippetElement ? snippetElement.textContent.trim() : "",
        });
      }
    });

    return results;
  }

  // Bing搜索结果提取
  extractBing() {
    const results = [];
    const resultElements = document.querySelectorAll(".b_algo");

    resultElements.forEach((element, index) => {
      if (index >= 10) return;

      const titleElement = element.querySelector("h2 a");
      const snippetElement = element.querySelector(".b_caption p, .b_snippet");

      if (titleElement) {
        results.push({
          title: titleElement.textContent.trim(),
          url: titleElement.href,
          snippet: snippetElement ? snippetElement.textContent.trim() : "",
        });
      }
    });

    return results;
  }

  // DuckDuckGo搜索结果提取
  extractDuckDuckGo() {
    const results = [];
    const resultElements = document.querySelectorAll('[data-result="result"]');

    resultElements.forEach((element, index) => {
      if (index >= 10) return;

      const titleElement = element.querySelector("h2 a, .result__title a");
      const snippetElement = element.querySelector(
        ".result__snippet, .result__body"
      );

      if (titleElement) {
        results.push({
          title: titleElement.textContent.trim(),
          url: titleElement.href,
          snippet: snippetElement ? snippetElement.textContent.trim() : "",
        });
      }
    });

    return results;
  }

  // 搜狗搜索结果提取
  extractSogou() {
    const results = [];
    const resultElements = document.querySelectorAll(".results .rb");

    resultElements.forEach((element, index) => {
      if (index >= 10) return;

      const titleElement = element.querySelector("h3 a");
      const snippetElement = element.querySelector(".ft");

      if (titleElement) {
        results.push({
          title: titleElement.textContent.trim(),
          url: titleElement.href,
          snippet: snippetElement ? snippetElement.textContent.trim() : "",
        });
      }
    });

    return results;
  }

  // 360搜索结果提取
  extract360() {
    const results = [];
    const resultElements = document.querySelectorAll(".result");

    resultElements.forEach((element, index) => {
      if (index >= 10) return;

      const titleElement = element.querySelector(".res-title a");
      const snippetElement = element.querySelector(".res-rich, .res-desc");

      if (titleElement) {
        results.push({
          title: titleElement.textContent.trim(),
          url: titleElement.href,
          snippet: snippetElement ? snippetElement.textContent.trim() : "",
        });
      }
    });

    return results;
  }

  // GitHub搜索结果提取
  extractGitHub() {
    const results = [];
    const resultElements = document.querySelectorAll(
      ".repo-list-item, .search-result-item"
    );

    resultElements.forEach((element, index) => {
      if (index >= 10) return;

      const titleElement = element.querySelector(".f4 a, .v-align-middle");
      const snippetElement = element.querySelector(
        ".repo-list-description, .search-result-description"
      );

      if (titleElement) {
        results.push({
          title: titleElement.textContent.trim(),
          url: titleElement.href,
          snippet: snippetElement ? snippetElement.textContent.trim() : "",
        });
      }
    });

    return results;
  }

  // Stack Overflow搜索结果提取
  extractStackOverflow() {
    const results = [];
    const resultElements = document.querySelectorAll(".question-summary");

    resultElements.forEach((element, index) => {
      if (index >= 10) return;

      const titleElement = element.querySelector(".question-hyperlink");
      const snippetElement = element.querySelector(".excerpt");

      if (titleElement) {
        results.push({
          title: titleElement.textContent.trim(),
          url: titleElement.href,
          snippet: snippetElement ? snippetElement.textContent.trim() : "",
        });
      }
    });

    return results;
  }

  // 维基百科搜索结果提取
  extractWikipedia() {
    const results = [];
    const resultElements = document.querySelectorAll(".mw-search-result");

    resultElements.forEach((element, index) => {
      if (index >= 10) return;

      const titleElement = element.querySelector(".mw-search-result-heading a");
      const snippetElement = element.querySelector(".searchresult");

      if (titleElement) {
        results.push({
          title: titleElement.textContent.trim(),
          url: titleElement.href,
          snippet: snippetElement ? snippetElement.textContent.trim() : "",
        });
      }
    });

    return results;
  }

  // 知乎搜索结果提取
  extractZhihu() {
    const results = [];
    const resultElements = document.querySelectorAll(".SearchResult-Card");

    resultElements.forEach((element, index) => {
      if (index >= 10) return;

      const titleElement = element.querySelector("h2 a, .ContentItem-title a");
      const snippetElement = element.querySelector(
        ".RichText, .ContentItem-meta"
      );

      if (titleElement) {
        results.push({
          title: titleElement.textContent.trim(),
          url: titleElement.href,
          snippet: snippetElement ? snippetElement.textContent.trim() : "",
        });
      }
    });

    return results;
  }

  // B站搜索结果提取
  extractBilibili() {
    const results = [];
    const resultElements = document.querySelectorAll(
      ".video-item, .bili-video-card"
    );

    resultElements.forEach((element, index) => {
      if (index >= 10) return;

      const titleElement = element.querySelector(
        ".title a, .bili-video-card__info--tit a"
      );
      const snippetElement = element.querySelector(
        ".des, .bili-video-card__info--desc"
      );

      if (titleElement) {
        results.push({
          title: titleElement.textContent.trim(),
          url: titleElement.href,
          snippet: snippetElement ? snippetElement.textContent.trim() : "",
        });
      }
    });

    return results;
  }

  // 通用提取器（其他搜索引擎）
  extractGeneric() {
    const results = [];

    // 尝试多种常见的结果选择器
    const selectors = [
      "h3 a",
      "h2 a",
      ".result a",
      ".search-result a",
      '[href*="/url?"]',
      '[href*="http"]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach((element, index) => {
          if (index >= 10) return;

          const title = element.textContent.trim();
          const url = element.href;

          if (title && url && !url.includes("javascript:")) {
            results.push({
              title: title,
              url: url,
              snippet: "",
            });
          }
        });
        break;
      }
    }

    return results;
  }

  // Yandex搜索结果提取
  extractYandex() {
    const results = [];
    const resultElements = document.querySelectorAll(".serp-item");

    resultElements.forEach((element, index) => {
      if (index >= 10) return;

      const titleElement = element.querySelector(".organic__url-text, h2 a");
      const snippetElement = element.querySelector(".organic__text");

      if (titleElement) {
        results.push({
          title: titleElement.textContent.trim(),
          url: titleElement.href || titleElement.closest("a")?.href,
          snippet: snippetElement ? snippetElement.textContent.trim() : "",
        });
      }
    });

    return results;
  }

  // Yahoo搜索结果提取
  extractYahoo() {
    const results = [];
    const resultElements = document.querySelectorAll(".algo, .SearchResult");

    resultElements.forEach((element, index) => {
      if (index >= 10) return;

      const titleElement = element.querySelector("h3 a, .compTitle a");
      const snippetElement = element.querySelector(".compText, .abs");

      if (titleElement) {
        results.push({
          title: titleElement.textContent.trim(),
          url: titleElement.href,
          snippet: snippetElement ? snippetElement.textContent.trim() : "",
        });
      }
    });

    return results;
  }
}

// 导出提取器
window.SearchResultExtractor = SearchResultExtractor;
