console.log('injected.js已激活！'); 

// 百度统计
const websiteMap = {
  'chatgpt.com': '05a65cb13c139654043f891fc940ef6d',
  'chat.deepseek.com': 'a972f412f42b52794f5bff99eb136e05',
  'yuanbao.tencent.com': 'e6ad649de4a4d5cbfb75f85ac2999d68',
  'cloud.siliconflow.cn': '02acfdbabe66d51aacabe3170e1e6b6d'
}
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?" + websiteMap[window.location.host];
  var s = document.getElementsByTagName("script")[0]; 
  s.parentNode.insertBefore(hm, s);
})();