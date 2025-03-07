document.addEventListener('DOMContentLoaded', function() {
  // 获取版本号并显示
  const manifest = chrome.runtime.getManifest();
  document.querySelector('.version').textContent = '版本: ' + manifest.version;
  
  // 设置选项按钮点击事件
  document.getElementById('options-btn').addEventListener('click', function() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });
  
  // 问题反馈按钮点击事件
  document.getElementById('feedback-btn').addEventListener('click', function() {
    window.open('https://github.com/zdl3ng/deepseek-chat-outline/issues/new', '_blank');
  });
});