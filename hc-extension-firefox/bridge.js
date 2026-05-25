// ISOLATED world: chrome APIが使える
// background.jsからメッセージを受け取りMAIN worldに転送する
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.type === 'EXEC_DECKLOG') {
    // window.postMessageでMAIN worldのmain.jsに転送
    window.postMessage({ type: 'HC_EXEC_DECKLOG', data: msg.data }, '*');
    sendResponse({ ok: true });
  }
});
