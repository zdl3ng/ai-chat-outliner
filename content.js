// 创建目录容器
function createOutlineContainer() {
  const container = document.createElement('div');
  container.className = 'outline-container';
  container.innerHTML = `
    <div class="outline-title">对话目录</div>
    <ul class="outline-list"></ul>
  `;
  document.body.appendChild(container);
  return container;
}

// 获取问题文本
function getQuestionText(element) {
  const questionElement = element.parentNode.previousElementSibling;
  if (!questionElement) return '';
  const text = questionElement.textContent.trim();
  return text.length > 25 ? text.slice(0, 25) + '...' : text;
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
    <span class="toggle">›</span>
    <span class="question-text">${question}</span>
  `;
  
  // 创建标题列表
  const titlesList = document.createElement('div');
  titlesList.className = 'outline-h3-list';
  titles.forEach(({text, element}) => {
    const titleDiv = document.createElement('div');
    titleDiv.className = 'outline-h3';
    titleDiv.textContent = text;
    titleDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      element.scrollIntoView({ behavior: 'smooth' });
      updateActiveState(titleDiv);
    });
    titlesList.appendChild(titleDiv);
  });
  
  // 添加展开/折叠图标点击事件
  const toggleButton = questionDiv.querySelector('.toggle');
  toggleButton.addEventListener('click', (e) => {
    e.stopPropagation();
    questionDiv.classList.toggle('collapsed');
    Array.from(titlesList.children).forEach(child => {
      child.classList.toggle('hidden');
    });
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
  
  // 清空现有目录
  list.innerHTML = '';
  
  // 生成新目录
  responses.forEach(response => {
    const question = getQuestionText(response);
    const titles = getH3Titles(response);
    if (question) {
      const item = createOutlineItem(question, titles, response);
      list.appendChild(item);
    }
  });
}

// 创建观察器
const observer = new MutationObserver((mutations) => {
  const hasContentChange = mutations.some(mutation => {
    return Array.from(mutation.addedNodes).some(node => 
      node.nodeType === 1 && (
        node.classList?.contains('ds-markdown') ||
        node.querySelector?.('.ds-markdown')
      )
    );
  });
  
  if (hasContentChange) {
    updateOutline();
  }
});

// 开始观察
const config = { childList: true, subtree: true };
const targetNode = document.body;
observer.observe(targetNode, config);

// 初始化目录
updateOutline();