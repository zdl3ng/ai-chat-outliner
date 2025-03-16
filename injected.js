console.log('injected.js已激活！'); 
(function() {
  var hm = document.createElement("script");
  hm.src = "https://blog.zdl3ng.top/js/ai-tongji.js?t=" + Date.now();
  var s = document.getElementsByTagName("script")[0]; 
  s.parentNode.insertBefore(hm, s);
})();