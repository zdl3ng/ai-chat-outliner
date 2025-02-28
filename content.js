// 创建目录容器
function createOutlineContainer() {
  const container = document.createElement('div');
  container.className = 'outline-container';
  container.innerHTML = `
    <div class="outline-header">
      <div class="outline-title">对话目录</div>
      <div class="outline-controls">
        <span class="outline-toggle-all" title="全部展开">+</span>
      </div>
    </div>
    <ul class="outline-list"></ul>
  `;

  // 添加全局展开/折叠事件监听
  const toggleAllBtn = container.querySelector('.outline-toggle-all');
  let isExpanded = false;

  // 初始化时检查所有问题的展开状态
  const updateExpandedState = () => {
    const allQuestions = container.querySelectorAll('.outline-question');
    isExpanded = Array.from(allQuestions).every(q => !q.classList.contains('collapsed'));
    toggleAllBtn.textContent = isExpanded ? '-' : '+';
    toggleAllBtn.title = isExpanded ? '全部折叠' : '全部展开';
  };

  toggleAllBtn.addEventListener('click', () => {
    isExpanded = !isExpanded;
    toggleAllBtn.textContent = isExpanded ? '-' : '+';
    toggleAllBtn.title = isExpanded ? '全部折叠' : '全部展开';

    container.querySelectorAll('.outline-question').forEach(item => {
      if (isExpanded) {
        item.classList.remove('collapsed');
        const titlesList = item.nextElementSibling;
        Array.from(titlesList.children).forEach(child => {
          child.classList.remove('hidden');
        });
        const toggleButton = item.querySelector('.toggle');
        toggleButton.textContent = '-';
        toggleButton.title = '折叠';
      } else {
        item.classList.add('collapsed');
        const titlesList = item.nextElementSibling;
        Array.from(titlesList.children).forEach(child => {
          child.classList.add('hidden');
        });
        const toggleButton = item.querySelector('.toggle');
        toggleButton.textContent = '+';
        toggleButton.title = '展开';
      }
    });
  });

  document.body.appendChild(container);
  return container;
}

// 获取问题文本
function getQuestionText(element) {
  const questionElement = element.parentNode.previousElementSibling;
  if (!questionElement) return '';
  const text = questionElement.textContent.trim();
  return text;
}

// 获取回复中的 h3 标题
function getH3Titles(element) {
  return Array.from(element.querySelectorAll('h3')).map(h3 => ({
    text: h3.textContent.trim(),
    element: h3
  }));
}

// 创建目录项
function createOutlineItem(question, titles, responseElement) {
  const li = document.createElement('li');
  li.className = 'outline-item';
  
  // 创建问题项
  const questionDiv = document.createElement('div');
  questionDiv.className = 'outline-question';
  questionDiv.innerHTML = `
    <span class="toggle">+</span>
    <span class="question-text" title="${question}">${question}</span>
  `;
  
  // 创建标题列表
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
      updateActiveState(titleDiv);
    });
    titlesList.appendChild(titleDiv);
  });
  
  // 添加展开/折叠图标点击事件
  const toggleButton = questionDiv.querySelector('.toggle');
  const updateToggleButton = (isCollapsed) => {
    toggleButton.textContent = isCollapsed ? '+' : '-';
    toggleButton.title = isCollapsed ? '展开' : '折叠';
  };

  // 设置初始状态
  updateToggleButton(true);

  toggleButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const willBeCollapsed = !questionDiv.classList.contains('collapsed');
    questionDiv.classList.toggle('collapsed');
    Array.from(titlesList.children).forEach(child => {
      child.classList.toggle('hidden');
    });
    updateToggleButton(willBeCollapsed);

    // 更新顶部按钮状态
    const container = document.querySelector('.outline-container');
    const allQuestions = container.querySelectorAll('.outline-question');
    const allExpanded = Array.from(allQuestions).every(q => !q.classList.contains('collapsed'));
    const toggleAllBtn = container.querySelector('.outline-toggle-all');
    toggleAllBtn.textContent = allExpanded ? '-' : '+';
    toggleAllBtn.title = allExpanded ? '全部折叠' : '全部展开';
    isExpanded = allExpanded; // 同步更新 isExpanded 变量
  });
  // 添加问题文本点击事件
  const questionText = questionDiv.querySelector('.question-text');
  questionText.addEventListener('click', (e) => {
    e.stopPropagation();
    const questionElement = responseElement.parentNode.previousElementSibling;
    if (questionElement) {
      questionElement.scrollIntoView({ behavior: 'smooth' });
      updateActiveState(questionDiv);
    }
  });
  
  li.appendChild(questionDiv);
  li.appendChild(titlesList);
  return li;
}

// 更新激活状态
function updateActiveState(clickedElement) {
  // 移除所有激活状态
  document.querySelectorAll('.outline-active').forEach(el => {
    el.classList.remove('outline-active');
  });
  // 添加新的激活状态
  clickedElement.classList.add('outline-active');
}

// 更新目录
function updateOutline() {
  const container = document.querySelector('.outline-container') || createOutlineContainer();
  const list = container.querySelector('.outline-list');
  const responses = document.querySelectorAll('.ds-markdown.ds-markdown--block');
  
  // 获取现有目录项的信息
  const existingItems = Array.from(list.children).map(item => {
    const questionText = item.querySelector('.question-text').textContent;
    const titles = Array.from(item.querySelector('.outline-h3-list').children).map(h3 => h3.textContent);
    return { questionText, titles };
  });
  
  // 生成新目录
  responses.forEach(response => {
    const question = getQuestionText(response);
    const titles = getH3Titles(response);
    
    if (question) {
      // 检查是否已存在相同的问题
      const existingItem = existingItems.find(item => item.questionText === question);
      
      if (!existingItem) {
        // 如果是新问题，直接添加
        const item = createOutlineItem(question, titles, response);
        list.appendChild(item);
      } else {
        // 如果问题已存在，检查标题是否有变化
        const newTitles = titles.map(t => t.text);
        const hasNewTitles = newTitles.some(title => !existingItem.titles.includes(title));
        
        if (hasNewTitles) {
          // 如果有新标题，更新整个问题项
          const oldItem = Array.from(list.children).find(
            li => li.querySelector('.question-text').textContent === question
          );
          const newItem = createOutlineItem(question, titles, response);
          
          // 保持展开/折叠状态
          if (oldItem.querySelector('.outline-question').classList.contains('collapsed')) {
            newItem.querySelector('.outline-question').classList.add('collapsed');
            Array.from(newItem.querySelector('.outline-h3-list').children).forEach(child => {
              child.classList.add('hidden');
            });
          }
          
          list.replaceChild(newItem, oldItem);
        }
      }
    }
  });
  
  // 移除不再存在的问题
  const currentQuestions = Array.from(responses).map(response => getQuestionText(response));
  Array.from(list.children).forEach(item => {
    const questionText = item.querySelector('.question-text').textContent;
    if (!currentQuestions.includes(questionText)) {
      list.removeChild(item);
    }
  });
}

// 创建防抖函数
function debounce(func, wait) {
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

// 使用防抖包装更新函数
const debouncedUpdateOutline = debounce(updateOutline, 1000);

// 创建观察器
const observer = new MutationObserver((mutations) => {
  const hasContentChange = mutations.some(mutation => {
    // 检查新增节点
    const hasAddedChange = Array.from(mutation.addedNodes).some(node => {
      if (node.nodeType !== 1) return false;
      
      // 递归向上查找父节点，检查是否包含目标类名
      let current = node;
      while (current && current !== document.body) {
        if (current.classList?.contains('ds-markdown')) {
          return true;
        }
        current = current.parentNode;
      }
      return false;
    });

    // 检查移除节点
    const hasRemovedChange = Array.from(mutation.removedNodes).some(node => {
      if (node.nodeType !== 1) return false;
      
      // 递归向上查找父节点，检查是否包含目标类名
      let current = node;
      while (current && current !== document.body) {
        if (current.classList?.contains('ds-markdown')) {
          return true;
        }
        current = current.parentNode;
      }
      return false;
    });

    return hasAddedChange || hasRemovedChange;
  });
  
  if (hasContentChange) {
    debouncedUpdateOutline();
  }
});

// 开始观察
const config = { childList: true, subtree: true };
const targetNode = document.body;
observer.observe(targetNode, config);

// 初始化目录
debouncedUpdateOutline();