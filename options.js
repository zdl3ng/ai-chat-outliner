document.addEventListener('DOMContentLoaded', function() {
  // 加载保存的设置
  loadSettings();
  
  // 保存按钮点击事件
  document.getElementById('save-btn').addEventListener('click', function() {
    saveSettings();
  });
  
  // 重置按钮点击事件
  document.getElementById('reset-btn').addEventListener('click', function() {
    resetSettings();
  });
});

// 加载保存的设置
function loadSettings() {
  chrome.storage.sync.get({
    // 默认设置
    autoShow: true,
    width: 250,
    allowDrag: false
  }, function(items) {
    // 应用设置到表单
    document.getElementById('auto-show').checked = items.autoShow;
    document.getElementById('width').value = items.width;
    document.getElementById('allow-drag').checked = items.allowDrag;
  });
}

// 保存设置
function saveSettings() {
  const settings = {
    autoShow: document.getElementById('auto-show').checked,
    width: parseInt(document.getElementById('width').value, 10),
    allowDrag: document.getElementById('allow-drag').checked
  };
  
  chrome.storage.sync.set(settings, function() {
    // 显示保存成功消息
    const status = document.getElementById('status');
    status.textContent = '设置已保存';
    status.className = 'status success';
    
    // 3秒后隐藏消息
    setTimeout(function() {
      status.className = 'status';
    }, 3000);
  });
}

// 重置设置
function resetSettings() {
  // 默认设置
  const defaultSettings = {
    autoShow: true,
    width: 250,
    allowDrag: false
  };
  
  // 应用默认设置到表单
  document.getElementById('auto-show').checked = defaultSettings.autoShow;
  document.getElementById('width').value = defaultSettings.width;
  document.getElementById('allow-drag').checked = defaultSettings.allowDrag;
  
  // 保存默认设置
  chrome.storage.sync.set(defaultSettings, function() {
    // 显示重置成功消息
    const status = document.getElementById('status');
    status.textContent = '设置已重置为默认值';
    status.className = 'status success';
    
    // 3秒后隐藏消息
    setTimeout(function() {
      status.className = 'status';
    }, 3000);
  });
}