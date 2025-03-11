// 存储所有标签页的URL信息和匹配状态 {tabId: {url, matched}}
let tabUrlMap = {};

// 记录当前激活的标签页ID
let activeTabId = null;

// 初始化图标状态
function initIconState() {
  // 获取当前激活的标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const tab = tabs[0];
      activeTabId = tab.id;
      const matched = checkUrlMatch(tab.url);
      tabUrlMap[tab.id] = { url: tab.url, matched };
      updateIcon();
    }
  });
}

// 更新扩展图标
function updateIcon() {
  // 如果匹配，则显示正常图标
  if (activeTabId && tabUrlMap[activeTabId] && tabUrlMap[activeTabId].matched) {
    chrome.action.setIcon({ path: 'icons/48.png' });
    return;
  }
  
  // 如果当前页面不匹配支持的网站，则显示灰色图标
  chrome.action.setIcon({ path: 'icons/48-disabled.png' });
}

// 检查URL是否匹配支持的网站
function checkUrlMatch(url) {
  if (!url) return false;
  
  // 从manifest.json中动态获取匹配模式
  const manifest = chrome.runtime.getManifest();
  const patterns = manifest.content_scripts[0].matches;
  
  // 将通配符模式转换为正则表达式
  for (const pattern of patterns) {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    
    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(url)) {
      return true;
    }
  }
  
  return false;
}

// 查询所有标签页
function queryAllTabAndUpdateTabUrlMap(){
  chrome.tabs.query({},(result) =>{
    result.forEach((tab) => {
      const matched = checkUrlMatch(tab.url);
      tabUrlMap[tab.id] = { url: tab.url, matched };
    });
    updateIcon();
  });
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 如果是当前激活的标签页且加载完成，则更新图标状态
  if (changeInfo.status === 'complete' && tabId === activeTabId) {
    queryAllTabAndUpdateTabUrlMap();
  }
});

// 监听标签页激活
chrome.tabs.onActivated.addListener((activeInfo) => {
  // 更新当前激活的标签页ID
  activeTabId = activeInfo.tabId;
  queryAllTabAndUpdateTabUrlMap();
});

// 监听标签页移除
chrome.tabs.onRemoved.addListener((tabId) => {
  // 从映射中删除已关闭的标签页
  if (tabUrlMap[tabId]) {
    delete tabUrlMap[tabId];
    queryAllTabAndUpdateTabUrlMap();
  }
});

// 初始化
initIconState();