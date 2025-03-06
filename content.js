/******************************************************************************
 * 核心类定义：OutlineManager
 * 该模块实现了对话目录的核心功能，包括：
 * - 目录容器的创建和管理
 * - 目录项的创建和更新
 * - 展开/折叠状态的控制
 * - DOM变化的监听和处理
 ******************************************************************************/

const OutlineManager = (function() {
  class OutlineManager {
    /**
     * 创建 OutlineManager 实例
     * @param {Object} config - 平台配置对象
     * @param {string} config.name - 平台名称
     * @param {string[]} config.matches - URL 匹配规则
     * @param {Object} config.selectors - DOM 选择器配置
     * @param {string} config.containerPosition - 目录容器放置位置
     */
    constructor(config) {
      this.config = config;
      this.container = null;
      this.isExpanded = true;
      this.observer = null;
      this.debouncedUpdate = this.debounce(this.updateOutline.bind(this), 300);
      this.isDragging = false;
      this.dragOffset = { x: 0, y: 0 };
    }
    calculateHash(text) {
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash.toString(36);
    }

    /**
     * 初始化目录管理器
     * 创建目录容器、设置 DOM 观察器并更新目录
     */
    init() {
      this.container = this.createContainer();
      this.setupObserver();
      this.updateOutline();
    }

    /**
     * 创建目录容器
     * @returns {HTMLElement} 创建的目录容器元素
     */
    createContainer() {
      const container = document.createElement('div');
      container.className = 'outline-container';
      container.innerHTML = `
        <div class="outline-header">
          <div class="outline-controls">
            <span class="outline-drawer-handle" title="收起目录">></span>
          </div>
          <div class="outline-title">对话目录</div>
          <div class="outline-controls">
            <span class="outline-toggle-all" title="全部折叠">-</span>
            <span class="outline-refresh" title="刷新目录">↻</span>
          </div>
        </div>
        <ul class="outline-list"></ul>
      `;

      const toggleAllBtn = container.querySelector('.outline-toggle-all');
      toggleAllBtn.addEventListener('click', () => this.toggleAll());

      const refreshBtn = container.querySelector('.outline-refresh');
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('loading');
        this.updateOutline();
        setTimeout(() => {
          refreshBtn.classList.remove('loading');
        }, 1000);
      });

      const drawerHandleBtn = container.querySelector('.outline-drawer-handle');
      drawerHandleBtn.addEventListener('click', () => {
        container.classList.toggle('collapsed');
        const outlineList = container.querySelector('.outline-list');
        outlineList.style.display = container.classList.contains('collapsed') ? 'none' : 'block';
        drawerHandleBtn.title = container.classList.contains('collapsed') ? '展开目录' : '收起目录';
      });
      
      // 添加拖拽功能
      this.setupDraggable(container);
      
      document.querySelector(this.config.containerPosition).appendChild(container);
      return container;
    }

    /**
     * 创建目录项
     * @param {string} question - 问题文本
     * @param {Array<{text: string, element: HTMLElement}>} titles - 标题列表
     * @param {HTMLElement} responseElement - 回答内容元素
     * @returns {HTMLElement} 创建的目录项元素
     */
    createOutlineItem(question, titles, responseElement) {
      const li = document.createElement('li');
      li.className = 'outline-item';
      
      const questionDiv = document.createElement('div');
      questionDiv.className = 'outline-question';
      const questionHash = this.calculateHash(question);
      questionDiv.dataset.questionHash = questionHash;
      questionDiv.innerHTML = `
        <span class="toggle">-</span>
        <span class="question-text" title="${question}">${question}</span>
      `;
      
      const titlesList = document.createElement('div');
      titlesList.className = 'outline-h3-list';
      titles.forEach(({text, element}) => {
        const titleDiv = document.createElement('div');
        titleDiv.className = 'outline-h3';
        titleDiv.textContent = text;
        titleDiv.title = text;
        titleDiv.addEventListener('click', (e) => {
          e.stopPropagation();
          element.scrollIntoView({ behavior: 'smooth' });
          this.updateActiveState(titleDiv);
        });
        titlesList.appendChild(titleDiv);
      });
      
      const toggleButton = questionDiv.querySelector('.toggle');
      toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleItem(questionDiv, titlesList);
      });

      const questionText = questionDiv.querySelector('.question-text');
      questionText.addEventListener('click', (e) => {
        e.stopPropagation();
        const questionElement = this.config.selectors.question(responseElement);
        if (questionElement) {
          questionElement.scrollIntoView({ behavior: 'smooth' });
          this.updateActiveState(questionDiv);
        }
      });
      
      li.appendChild(questionDiv);
      li.appendChild(titlesList);
      return li;
    }

    /**
     * 更新目录内容
     * 根据页面内容更新目录项，包括添加新项、更新已有项和删除不存在的项
     */
    updateOutline() {
      const list = this.container.querySelector('.outline-list');
      const responses = document.querySelectorAll(this.config.selectors.response);
      
      const existingItems = Array.from(list.children).map(item => ({
        questionText: item.querySelector('.question-text').textContent,
        questionHash: item.querySelector('.outline-question').dataset.questionHash,
        titles: Array.from(item.querySelector('.outline-h3-list').children).map(h3 => h3.textContent),
        collapsed: item.querySelector('.outline-question').classList.contains('collapsed')
      }));

      let hasDiff = false;
      if (responses?.length >= list?.children?.length) {
         responses.forEach((response, index) => {
            const question = this.config.selectors.question(response)?.textContent.trim() || '';
            const questionHash = this.calculateHash(question);
            if (index < existingItems.length && existingItems[index]?.questionHash !== questionHash) {
              hasDiff = true;
            }
         })
      } else {
        hasDiff = true;
      }

      // 不同对话，删除重新渲染目录
      if (hasDiff) {
         // 清空现有目录
         list.innerHTML = '';
         // 重置现有目录项记录
         existingItems.length = 0;
      }
      
      // 重新渲染目录
      responses.forEach((response, index) => {
        // 回复的问题
        const question = this.config.selectors.question(response)?.textContent.trim() || '';
        // 回复的标题
        const titles = this.config.selectors.titles(response);
        
        if (question) {
          // 目录中是否有该问题
          const isExisted = existingItems[index]?.questionHash === this.calculateHash(question);
          const existingItem = existingItems[index];
          
          // 没有该问题：添加新项
          if (!isExisted) {
            const item = this.createOutlineItem(question, titles, response);
            list.appendChild(item);
          } else {
            // 有该问题：比较 将不存在的更新上
            const newTitles = titles.map(t => t.text);
            const hasNewTitles = newTitles.some(title => !existingItem.titles.includes(title));
            
            if (hasNewTitles) {
              const oldItem = Array.from(list.children).find(
                li => li.querySelector('.outline-question').dataset.questionHash === this.calculateHash(question)
              );
              const oldItemCollapsed = oldItem.querySelector('.outline-question').classList.contains('collapsed');
              
              const newItem = this.createOutlineItem(question, titles, response);
              
              if (oldItemCollapsed) {
                this.collapseItem(newItem.querySelector('.outline-question'), newItem.querySelector('.outline-h3-list'));
              }
              
              list.replaceChild(newItem, oldItem);
            }
          }
        }
      });

      this.updateExpandedState();
    }

    /**
     * 切换目录项的展开/折叠状态
     * @param {HTMLElement} questionDiv - 问题容器元素
     * @param {HTMLElement} titlesList - 标题列表容器元素
     */
    toggleItem(questionDiv, titlesList) {
      const willBeCollapsed = !questionDiv.classList.contains('collapsed');
      if (willBeCollapsed) {
        this.collapseItem(questionDiv, titlesList);
      } else {
        this.expandItem(questionDiv, titlesList);
      }
      this.updateExpandedState();
    }

    /**
     * 折叠目录项
     * @param {HTMLElement} questionDiv - 问题容器元素
     * @param {HTMLElement} titlesList - 标题列表容器元素
     */
    collapseItem(questionDiv, titlesList) {
      questionDiv.classList.add('collapsed');
      Array.from(titlesList.children).forEach(child => child.classList.add('hidden'));
      const toggleButton = questionDiv.querySelector('.toggle');
      toggleButton.textContent = '+';
      toggleButton.title = '展开';
    }

    /**
     * 展开目录项
     * @param {HTMLElement} questionDiv - 问题容器元素
     * @param {HTMLElement} titlesList - 标题列表容器元素
     */
    expandItem(questionDiv, titlesList) {
      questionDiv.classList.remove('collapsed');
      Array.from(titlesList.children).forEach(child => child.classList.remove('hidden'));
      const toggleButton = questionDiv.querySelector('.toggle');
      toggleButton.textContent = '-';
      toggleButton.title = '折叠';
    }

    /**
     * 切换所有目录项的展开/折叠状态
     */
    toggleAll() {
      const allQuestions = this.container.querySelectorAll('.outline-question');
      this.isExpanded = !this.isExpanded;
      
      allQuestions.forEach(questionDiv => {
        const titlesList = questionDiv.nextElementSibling;
        if (this.isExpanded) {
          this.expandItem(questionDiv, titlesList);
        } else {
          this.collapseItem(questionDiv, titlesList);
        }
      });
      
      this.updateExpandedState();
    }

    /**
     * 更新目录的整体展开状态
     * 根据所有目录项的状态更新全局展开/折叠按钮
     */
    updateExpandedState() {
      const allQuestions = this.container.querySelectorAll('.outline-question');
      this.isExpanded = Array.from(allQuestions).some(q => !q.classList.contains('collapsed'));
      const toggleAllBtn = this.container.querySelector('.outline-toggle-all');
      toggleAllBtn.textContent = this.isExpanded ? '-' : '+';
      toggleAllBtn.title = this.isExpanded ? '全部折叠' : '全部展开';
    }

    /**
     * 更新目录项的激活状态
     * @param {HTMLElement} clickedElement - 被点击的元素
     */
    updateActiveState(clickedElement) {
      this.container.querySelectorAll('.outline-active').forEach(el => {
        el.classList.remove('outline-active');
      });
      clickedElement.classList.add('outline-active');
    }

    /**
     * 设置 DOM 变化观察器
     * 监听页面内容变化并触发目录更新
     */
    setupObserver() {
      this.observer = new MutationObserver((mutations) => {
        const hasContentChange = mutations.some(mutation => {
          // 检查属性变化
          if (mutation.type === 'attributes') {
            let current = mutation.target;
            while (current && current !== document.body) {
              if (current.matches?.(this.config.selectors.observerMatches)) {
                return true;
              }
              current = current.parentNode;
            }
          }
          
          // 检查子节点变化
          return Array.from(mutation.addedNodes).concat(Array.from(mutation.removedNodes))
            .some(node => {
              if (node.nodeType !== 1) return false;
              
              // 检查节点本身是否匹配
              if (node.matches?.(this.config.selectors.observerMatches)) {
                return true;
              }
              
              // 检查节点是否包含匹配的元素
              if (node.querySelector?.(this.config.selectors.observerMatches)) {
                return true;
              }
              
              // 检查节点的父级链是否匹配
              let current = node;
              while (current && current !== document.body) {
                if (current.matches?.(this.config.selectors.observerMatches)) {
                  return true;
                }
                current = current.parentNode;
              }
              
              return false;
            });
        });
        
        if (hasContentChange) {
          this.debouncedUpdate();
        }
      });

      this.observer.observe(document.body, { 
        childList: true, 
        subtree: true, 
        attributes: true, 
        characterData: true 
      });
    }

    /**
     * 函数防抖
     * @param {Function} func - 需要防抖的函数
     * @param {number} wait - 等待时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }
    
    /**
     * 销毁目录管理器
     * 断开观察器连接并移除目录容器
     */
    destroy() {
      if (this.observer) {
        this.observer.disconnect();
      }
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }
    
    /**
     * 设置容器的拖拽功能
     * @param {HTMLElement} container - 目录容器元素
     */
    setupDraggable(container) {
      const header = container.querySelector('.outline-header');
      
      header.addEventListener('mousedown', (e) => {
        // 只有点击标题栏空白区域或标题文本时才允许拖动
        if (e.target.classList.contains('outline-header') || 
            e.target.classList.contains('outline-title')) {
          this.isDragging = true;
          
          // 计算鼠标点击位置与容器左上角的偏移量
          const rect = container.getBoundingClientRect();
          this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          };
          
          // 防止文本选中
          e.preventDefault();
        }
      });
      
      document.addEventListener('mousemove', (e) => {
        if (this.isDragging) {
          // 计算新位置
          const x = e.clientX - this.dragOffset.x;
          const y = e.clientY - this.dragOffset.y;
          
          // 限制在视窗内
          const maxX = window.innerWidth - container.offsetWidth;
          const maxY = window.innerHeight - container.offsetHeight;
          
          const boundedX = Math.max(0, Math.min(x, maxX));
          const boundedY = Math.max(0, Math.min(y, maxY));
          
          // 更新位置
          container.style.left = boundedX + 'px';
          container.style.top = boundedY + 'px';
          container.style.right = 'auto';
        }
      });
      
      document.addEventListener('mouseup', () => {
        this.isDragging = false;
      });
    }
  }

  return OutlineManager;
})();



/******************************************************************************
 * 平台配置对象 (platformConfigs)
 * 用于定义不同 AI 对话平台的配置信息，支持多平台扩展
 * 
 * 配置对象结构：
 * {
 *   [平台标识]: {  // 平台的唯一标识符，如 'deepseek', 'chatgpt' 等
 *     name: string,  // 平台名称
 *     matches: string[],  // URL 匹配规则，支持通配符 *
 *     selectors: {  // DOM 选择器配置
 *       response: string,  // 回答内容/提问（问题）内容 选择器
 *       observerMatches: string,  // 监听页面内容(即AI回复的内容)变化时匹配的元素选择器
 *       question: (element) => string,  // 获取问题文本的函数
 *       titles: (element) => Array<{text: string, element: HTMLElement}>,  // 获取标题列表的函数
 *     },
 *     containerPosition: string  // 目录容器的放置位置的 CSS 选择器
 *   }
 * }
 ******************************************************************************/

const platformConfigs = {
  // Deepseek 平台配置
  deepseek: {
    name: 'Deepseek',  // 平台显示名称
    matches: ['*://chat.deepseek.com/*'],  // 匹配 deepseek.com 域名下的所有对话页面
    selectors: {
      response: '.ds-markdown.ds-markdown--block', // 选择回答内容的容器元素
      observerMatches: '.ds-markdown.ds-markdown--block', // 监控回答内容元素的选择器
      // 获取问题文本
      // @param element - 回答内容元素
      // @returns string - 问题文本，如果未找到则返回空字符串
      question: (element) => {
        const questionElement = element.parentNode.previousElementSibling;
        return questionElement;
      },
      
      // 获取回答中的所有三级标题
      // @param element - 回答内容元素
      // @returns Array<{text: string, element: HTMLElement}> - 标题信息数组
      titles: (element) => {
        return Array.from(element?.querySelectorAll('h1,h2,h3')||[]).map(h3 => ({
          text: h3.textContent.trim(),
          element: h3
        }));
      }
    },
    containerPosition: 'body'  // 将目录容器添加到 body 元素中
  },

  // ChatGPT 平台配置
  chatgpt: {
    name: 'ChatGPT',
    matches: ['*://chatgpt.com/*'],  // 匹配 OpenAI ChatGPT 的对话页面
    selectors: {
      response: '.whitespace-pre-wrap',  // 问题内容元素的选择器
      observerMatches: '.markdown',     // 监控回答内容元素的选择器
      // 获取问题文本
      // @param element - 回答内容元素
      // @returns string - 问题文本
      question: (element) => {
        const questionElement = element;
        return questionElement;
      },
      
      // 获取回答中的所有三级标题
      // @param element - 回答内容元素
      // @returns Array<{text: string, element: HTMLElement}> - 标题信息数组
      titles: (element) => {
        const md = element.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.nextElementSibling.querySelector(".markdown");
        return Array.from(md?.querySelectorAll('h1,h2,h3')||[]).map(h3 => ({
          text: h3.textContent.trim(),
          element: h3
        }));
      }
    },
    containerPosition: 'body'  // 将目录容器添加到应用根元素中
  },

  // 腾讯元宝 平台配置
  yuanbao: {
    name: 'YuanBao',
    matches: ['*://yuanbao.tencent.com/*'],  // 匹配 yuanbao ChatGPT 的对话页面
    selectors: {
      response: '.hyc-content-text',  // 问题内容的元素选择器
      observerMatches: '.hyc-common-markdown.hyc-common-markdown-style', // 监控回答内容元素的选择器
      // 获取问题文本
      // @param element - 回答内容元素
      // @returns string - 问题文本
      question: (element) => {
        const questionElement = element;
        return questionElement;
      },
      
      // 获取回答中的所有三级标题
      // @param element - 回答内容元素
      // @returns Array<{text: string, element: HTMLElement}> - 标题信息数组
      titles: (element) => {
        const md = element.parentElement.parentElement.parentElement.parentElement.parentElement.nextElementSibling.querySelector(".hyc-component-reasoner__text>.hyc-content-md>.hyc-common-markdown.hyc-common-markdown-style")
        || element.parentElement.parentElement.parentElement.parentElement.parentElement.nextElementSibling.querySelector(".hyc-component-text>.hyc-content-md>.hyc-common-markdown.hyc-common-markdown-style");
        const titles = Array.from(md?.querySelectorAll('h1,h2,h3')||[]).map(h3 => ({
          text: h3.textContent.trim(),
          element: h3
        }));
        return titles;
      }
    },
    containerPosition: 'body'  // 将目录容器添加到应用根元素中
  },

  // 硅基流动 平台配置
  siliconflow: {
    name: 'SiliconFlow',
    matches: ['*://cloud.siliconflow.cn/playground/chat/*'],  // 匹配 硅基流动 的对话页面
    selectors: {
      response: '.flex.items-end.justify-end',  // 问题内容的元素选择器 
      observerMatches: '.flex-1.w-full', // 监控回答内容元素的选择器
      // 获取问题文本
      // @param element - 回答内容元素
      // @returns string - 问题文本
      question: (element) => {
        const questionElement = element.querySelector('p');
        return questionElement;
      },
      
      // 获取回答中的所有三级标题
      // @param element - 回答内容元素
      // @returns Array<{text: string, element: HTMLElement}> - 标题信息数组
      titles: (element) => {
        const md = element.parentElement.nextElementSibling.querySelector('.flex-1.w-full');
        const titles = Array.from(md?.querySelectorAll('h1,h2,h3')||[]).map(h3 => ({
          text: h3.textContent.trim(),
          element: h3
        }));
        return titles;
      }
    },
    containerPosition: 'body'  // 将目录容器添加到应用根元素中
  }
};



/******************************************************************************
 * 初始化逻辑
 * 包含平台检测和目录初始化的相关函数
 ******************************************************************************/

/**
 * 获取当前平台的配置
 * 根据当前URL匹配适合的平台配置
 * @returns {Object|undefined} 匹配的平台配置对象，如果没有匹配则返回undefined
 */
function getCurrentPlatformConfig() {
  const currentURL = window.location.href;
  return Object.values(platformConfigs).find(config =>
    config.matches.some(pattern =>
      new RegExp('^' + pattern.replace(/\*/g, '.*') + '$').test(currentURL)
    )
  );
}

/**
 * 初始化目录
 * 根据当前平台配置创建并初始化OutlineManager实例
 */
function initializeOutline() {
  const platformConfig = getCurrentPlatformConfig();
  if (platformConfig) {
    const outlineManager = new OutlineManager(platformConfig);
    outlineManager.init();
  }
}

// 等待 DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOutline);
} else {
  initializeOutline();
}